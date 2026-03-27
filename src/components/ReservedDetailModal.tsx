import { X, Calendar, User, Trash2, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { Reservation, KitType, Lot } from '../types';
import { formatDate, calculateAvailableStock } from '../utils/stock';
import { KIT_CONFIGS } from '../constants/kits';
import { cancelReservation, createReservation } from '../services/inventory';

interface ReservedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  kitType: KitType;
  kitName: string;
  reservations: Reservation[];
  lots: Lot[];
}

interface GroupedReservation {
  chartNumber: string;
  examinationDate: string;
  reservations: Reservation[];
}

export function ReservedDetailModal({ isOpen, onClose, onUpdate, kitType, kitName, reservations, lots }: ReservedDetailModalProps) {
  const [isCanceling, setIsCanceling] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddKitModal, setShowAddKitModal] = useState(false);
  const [selectedChartNumber, setSelectedChartNumber] = useState('');
  const [selectedExaminationDate, setSelectedExaminationDate] = useState('');
  const [selectedKits, setSelectedKits] = useState<KitType[]>([]);

  if (!isOpen) return null;

  const handleCancelReservation = async (reservationIds: string[]) => {
    if (!confirm('この予約をキャンセルしますか？\n取り置き中の在庫が使用可能に戻ります。')) return;

    setIsCanceling(true);
    try {
      await Promise.all(reservationIds.map(id => cancelReservation(id)));
      await onUpdate();

      const remainingReservations = reservations.filter(
        r => !reservationIds.includes(r.id) && r.kit_type === kitType && r.status === 'reserved'
      );

      if (remainingReservations.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('キャンセルエラー:', error);
      alert('キャンセルに失敗しました');
    } finally {
      setIsCanceling(false);
    }
  };

  const filteredReservations = reservations.filter(
    r => r.kit_type === kitType && r.status === 'reserved'
  );

  const groupedReservations: GroupedReservation[] = [];

  filteredReservations.forEach((reservation) => {
    let group = groupedReservations.find(
      g => g.chartNumber === reservation.chart_number && g.examinationDate === reservation.examination_date
    );

    if (!group) {
      group = {
        chartNumber: reservation.chart_number,
        examinationDate: reservation.examination_date,
        reservations: [],
      };
      groupedReservations.push(group);
    }

    group.reservations.push(reservation);
  });

  groupedReservations.sort((a, b) => {
    return new Date(a.examinationDate).getTime() - new Date(b.examinationDate).getTime();
  });

  const getKitConfig = (kitType: string) => {
    return KIT_CONFIGS.find(k => k.type === kitType);
  };

  const handleOpenAddKits = (chartNumber: string, examinationDate: string, existingReservations: Reservation[]) => {
    setSelectedChartNumber(chartNumber);
    setSelectedExaminationDate(examinationDate);
    const existingKitTypes = existingReservations.map(r => r.kit_type);
    const availableKits = KIT_CONFIGS.map(k => k.type).filter(kt => !existingKitTypes.includes(kt));
    setSelectedKits(availableKits.length > 0 ? [availableKits[0]] : []);
    setShowAddKitModal(true);
  };

  const toggleKit = (kitType: KitType) => {
    setSelectedKits(prev => {
      if (prev.includes(kitType)) {
        return prev.filter(k => k !== kitType);
      }
      return [...prev, kitType];
    });
  };

  const handleAddKits = async () => {
    if (selectedKits.length === 0) {
      alert('少なくとも1つの検査項目を選択してください');
      return;
    }

    setIsAdding(true);
    try {
      await Promise.all(
        selectedKits.map(kitType =>
          createReservation(selectedExaminationDate, selectedChartNumber, kitType, lots)
        )
      );
      await onUpdate();
      setShowAddKitModal(false);
      setSelectedKits([]);
    } catch (error) {
      console.error('検査項目追加エラー:', error);
      alert(error instanceof Error ? error.message : '検査項目の追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">取り置き詳細</h2>
              <p className="text-sm text-gray-600">{kitName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {groupedReservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">取り置き中の予約はありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedReservations.map((group, idx) => (
                <div
                  key={`${group.chartNumber}_${group.examinationDate}_${idx}`}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-bold text-lg">カルテ: {group.chartNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        <span>検査日: {formatDate(group.examinationDate)}</span>
                      </div>
                      {group.reservations.length >= 1 && (
                        <div className="space-y-1 mt-2">
                          {group.reservations.map((reservation) => {
                            const config = getKitConfig(reservation.kit_type);
                            return (
                              <div key={reservation.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <div className={`w-4 h-4 ${config?.color} rounded flex items-center justify-center`}>
                                  <span className="text-white text-xs font-bold">
                                    {config?.name.substring(0, 1)}
                                  </span>
                                </div>
                                <span>{config?.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleOpenAddKits(group.chartNumber, group.examinationDate, group.reservations)}
                        disabled={isCanceling || isAdding}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        追加
                      </button>
                      <button
                        onClick={() => handleCancelReservation(group.reservations.map(r => r.id))}
                        disabled={isCanceling || isAdding}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
        </div>
      </div>

      {showAddKitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">検査項目を追加</h2>
              </div>
              <button
                onClick={() => setShowAddKitModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span>カルテ: {selectedChartNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>検査日: {formatDate(selectedExaminationDate)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">追加する検査項目（複数選択可）</label>
                <div className="grid grid-cols-2 gap-3">
                  {KIT_CONFIGS.map((config) => {
                    const existingReservation = groupedReservations
                      .find(g => g.chartNumber === selectedChartNumber && g.examinationDate === selectedExaminationDate)
                      ?.reservations.find(r => r.kit_type === config.type);

                    if (existingReservation) {
                      return (
                        <div
                          key={config.type}
                          className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-left text-gray-500">{config.name}</span>
                          </div>
                          <span className="text-xs block mt-1 text-gray-400">登録済み</span>
                        </div>
                      );
                    }

                    const stock = calculateAvailableStock(lots, config.type);
                    const isSelected = selectedKits.includes(config.type);

                    const colorClasses = {
                      pg1000: {
                        border: 'border-blue-500',
                        bg: 'bg-blue-50',
                        text: 'text-blue-700',
                        checkBg: 'bg-blue-500',
                      },
                      td1000: {
                        border: 'border-green-500',
                        bg: 'bg-green-50',
                        text: 'text-green-700',
                        checkBg: 'bg-green-500',
                      },
                      tf1000: {
                        border: 'border-yellow-500',
                        bg: 'bg-yellow-50',
                        text: 'text-yellow-700',
                        checkBg: 'bg-yellow-500',
                      },
                      pg2000: {
                        border: 'border-red-500',
                        bg: 'bg-red-50',
                        text: 'text-red-700',
                        checkBg: 'bg-red-500',
                      },
                    };

                    const colors = colorClasses[config.type];

                    return (
                      <button
                        key={config.type}
                        type="button"
                        onClick={() => toggleKit(config.type)}
                        className={`
                          p-4 rounded-lg border-2 font-bold transition-all relative
                          ${isSelected
                            ? `${colors.border} ${colors.bg} ${colors.text}`
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex-1 text-left">{config.name}</span>
                          {isSelected && (
                            <div className={`w-5 h-5 ${colors.checkBg} rounded flex items-center justify-center flex-shrink-0`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className={`text-xs block mt-1 ${stock === 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          在庫: {stock}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddKitModal(false)}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                  disabled={isAdding}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleAddKits}
                  disabled={isAdding || selectedKits.length === 0}
                  className="flex-1 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? '追加中...' : `追加 (${selectedKits.length}件)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
