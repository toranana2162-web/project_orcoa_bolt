import { CheckCircle, XCircle, Calendar, User, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Reservation, KitType, Lot } from '../types';
import { formatDate } from '../utils/stock';
import { markReservationAsUsed, cancelReservation, updateReservation, createReservation, fetchLots } from '../services/inventory';
import { KIT_CONFIGS } from '../constants/kits';

interface ReservationListProps {
  reservations: Reservation[];
  onUpdate: () => void;
}

interface GroupedReservation {
  chartNumber: string;
  examinationDate: string;
  reservations: Reservation[];
}

export function ReservationList({ reservations, onUpdate }: ReservationListProps) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    chartNumber: string;
    examinationDate: string;
    kitTypes: { reservationId: string | null; kitType: KitType; isNew?: boolean }[];
  }>({ chartNumber: '', examinationDate: '', kitTypes: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeReservations = reservations.filter(r => r.status === 'reserved');

  const groupedReservations: GroupedReservation[] = [];

  activeReservations.forEach((reservation) => {
    const key = `${reservation.chart_number}_${reservation.examination_date}`;
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

  const handleUse = async (id: string) => {
    if (!confirm('この予約を使用済みにしますか？')) return;

    try {
      await markReservationAsUsed(id);
      onUpdate();
    } catch (error) {
      console.error('使用済み処理エラー:', error);
      alert('使用済み処理に失敗しました');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('この予約をキャンセルしますか？\n在庫は元に戻ります。')) return;

    try {
      await cancelReservation(id);
      onUpdate();
    } catch (error) {
      console.error('キャンセル処理エラー:', error);
      alert('キャンセル処理に失敗しました');
    }
  };

  const handleUseAll = async (reservations: Reservation[]) => {
    if (!confirm(`${reservations.length}件の予約をすべて使用済みにしますか？`)) return;

    try {
      await Promise.all(reservations.map(r => markReservationAsUsed(r.id)));
      onUpdate();
    } catch (error) {
      console.error('一括使用済み処理エラー:', error);
      alert('一括使用済み処理に失敗しました');
    }
  };

  const handleCancelAll = async (reservations: Reservation[]) => {
    if (!confirm(`${reservations.length}件の予約をすべてキャンセルしますか？\n在庫は元に戻ります。`)) return;

    try {
      await Promise.all(reservations.map(r => cancelReservation(r.id)));
      onUpdate();
    } catch (error) {
      console.error('一括キャンセル処理エラー:', error);
      alert('一括キャンセル処理に失敗しました');
    }
  };

  const handleEdit = (group: GroupedReservation) => {
    const groupKey = `${group.chartNumber}_${group.examinationDate}`;
    setEditingGroup(groupKey);
    setEditForm({
      chartNumber: group.chartNumber,
      examinationDate: group.examinationDate,
      kitTypes: group.reservations.map(r => ({
        reservationId: r.id,
        kitType: r.kit_type,
      })),
    });
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setEditForm({ chartNumber: '', examinationDate: '', kitTypes: [] });
  };

  const handleAddKit = () => {
    const existingTypes = editForm.kitTypes.map(k => k.kitType);
    const availableTypes = KIT_CONFIGS.map(k => k.type).filter(t => !existingTypes.includes(t));

    if (availableTypes.length === 0) {
      alert('すべての検査キットが既に追加されています');
      return;
    }

    setEditForm({
      ...editForm,
      kitTypes: [
        ...editForm.kitTypes,
        { reservationId: null, kitType: availableTypes[0], isNew: true }
      ]
    });
  };

  const handleRemoveKit = (index: number) => {
    const newKitTypes = editForm.kitTypes.filter((_, i) => i !== index);
    setEditForm({ ...editForm, kitTypes: newKitTypes });
  };

  const handleSaveEdit = async () => {
    if (!editForm.chartNumber.trim() || !editForm.examinationDate) {
      alert('カルテ番号と検査日を入力してください');
      return;
    }

    if (editForm.kitTypes.length === 0) {
      alert('少なくとも1つの検査キットを選択してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const lots = await fetchLots();

      const updatePromises = editForm.kitTypes.map(async ({ reservationId, kitType, isNew }) => {
        if (isNew) {
          return createReservation(
            editForm.examinationDate,
            editForm.chartNumber,
            kitType,
            lots
          );
        } else if (reservationId) {
          return updateReservation(reservationId, {
            chart_number: editForm.chartNumber,
            examination_date: editForm.examinationDate,
            kit_type: kitType,
          });
        }
      });

      const group = groupedReservations.find(
        g => `${g.chartNumber}_${g.examinationDate}` === editingGroup
      );

      if (group) {
        const removedReservations = group.reservations.filter(
          r => !editForm.kitTypes.find(kt => kt.reservationId === r.id)
        );

        const cancelPromises = removedReservations.map(r => cancelReservation(r.id));
        await Promise.all([...updatePromises, ...cancelPromises]);
      } else {
        await Promise.all(updatePromises);
      }

      await onUpdate();
      setEditingGroup(null);
    } catch (error) {
      console.error('予約更新エラー:', error);
      alert(error instanceof Error ? error.message : '予約の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getKitConfig = (kitType: string) => {
    return KIT_CONFIGS.find(k => k.type === kitType);
  };

  if (activeReservations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">予約はありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-gray-800 p-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          予約一覧
        </h2>
      </div>

      <div className="divide-y">
        {groupedReservations.map((group, idx) => {
          const hasMultiple = group.reservations.length > 1;
          const groupKey = `${group.chartNumber}_${group.examinationDate}`;
          const isEditing = editingGroup === groupKey;

          return (
            <div
              key={`${group.chartNumber}_${group.examinationDate}`}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Edit2 className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-xl">予約編集</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      カルテ番号
                    </label>
                    <input
                      type="text"
                      value={editForm.chartNumber}
                      onChange={(e) => setEditForm({ ...editForm, chartNumber: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      検査日
                    </label>
                    <input
                      type="date"
                      value={editForm.examinationDate}
                      onChange={(e) => setEditForm({ ...editForm, examinationDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        検査キット
                      </label>
                      <button
                        onClick={handleAddKit}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        追加
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editForm.kitTypes.map((item, idx) => {
                        const config = getKitConfig(item.kitType);
                        const existingTypes = editForm.kitTypes.map((k, i) => i !== idx ? k.kitType : null);
                        return (
                          <div key={item.reservationId || `new-${idx}`} className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${config?.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-sm font-bold">
                                {config?.name.substring(0, 1)}
                              </span>
                            </div>
                            <select
                              value={item.kitType}
                              onChange={(e) => {
                                const newKitTypes = [...editForm.kitTypes];
                                newKitTypes[idx].kitType = e.target.value as KitType;
                                setEditForm({ ...editForm, kitTypes: newKitTypes });
                              }}
                              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                              disabled={isSubmitting}
                            >
                              {KIT_CONFIGS.map((kit) => (
                                <option
                                  key={kit.type}
                                  value={kit.type}
                                  disabled={existingTypes.includes(kit.type)}
                                >
                                  {kit.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveKit(idx)}
                              disabled={isSubmitting || editForm.kitTypes.length === 1}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={editForm.kitTypes.length === 1 ? '最後の検査キットは削除できません' : '削除'}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {isSubmitting ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-xl">カルテ: {group.chartNumber}</div>
                        <div className="text-sm text-gray-600">
                          検査日: {formatDate(group.examinationDate)}
                        </div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-2">
                      {group.reservations.map((reservation) => {
                        const config = getKitConfig(reservation.kit_type);
                        return (
                          <div key={reservation.id} className="flex items-center justify-between border-l-4 border-gray-200 pl-4 py-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 ${config?.color} rounded flex items-center justify-center`}>
                                <span className="text-white text-xs font-bold">
                                  {config?.name.substring(0, 1)}
                                </span>
                              </div>
                              <span className="font-semibold">{config?.name}</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUse(reservation.id)}
                                className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                使用
                              </button>
                              <button
                                onClick={() => handleCancel(reservation.id)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                キャンセル
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {hasMultiple ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEdit(group)}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors whitespace-nowrap"
                      >
                        <Edit2 className="w-5 h-5" />
                        編集
                      </button>
                      <button
                        onClick={() => handleUseAll(group.reservations)}
                        className="flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors whitespace-nowrap"
                      >
                        <CheckCircle className="w-5 h-5" />
                        すべて使用
                      </button>
                      <button
                        onClick={() => handleCancelAll(group.reservations)}
                        className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors whitespace-nowrap"
                      >
                        <XCircle className="w-5 h-5" />
                        すべてキャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(group)}
                      className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                      編集
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
