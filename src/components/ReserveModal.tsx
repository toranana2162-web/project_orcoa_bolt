import { useState } from 'react';
import { X, Calendar, AlertTriangle, Check } from 'lucide-react';
import type { KitType, Lot } from '../types';
import { createReservation } from '../services/inventory';
import { dateToInputValue, calculateAvailableStock } from '../utils/stock';
import { KIT_CONFIGS } from '../constants/kits';

interface ReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lots: Lot[];
}

export function ReserveModal({ isOpen, onClose, onSuccess, lots }: ReserveModalProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [examinationDate, setExaminationDate] = useState(dateToInputValue(tomorrow));
  const [chartNumber, setChartNumber] = useState('');
  const [selectedKits, setSelectedKits] = useState<KitType[]>(['pg1000']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleKit = (kitType: KitType) => {
    setSelectedKits(prev => {
      if (prev.includes(kitType)) {
        return prev.filter(k => k !== kitType);
      }
      return [...prev, kitType];
    });
  };

  const hasAnyStockIssue = selectedKits.some(kitType => calculateAvailableStock(lots, kitType) === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedKits.length === 0) {
      alert('少なくとも1つの検査項目を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedKits.map(kitType =>
          createReservation(examinationDate, chartNumber, kitType, lots)
        )
      );
      onSuccess();
      onClose();
      setChartNumber('');
      setSelectedKits(['pg1000']);
      const newTomorrow = new Date();
      newTomorrow.setDate(newTomorrow.getDate() + 1);
      setExaminationDate(dateToInputValue(newTomorrow));
    } catch (error) {
      console.error('予約登録エラー:', error);
      alert(error instanceof Error ? error.message : '予約登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">予約登録</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-3">検査日</label>
            <input
              type="date"
              value={examinationDate}
              onChange={(e) => setExaminationDate(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">カルテ番号</label>
            <input
              type="text"
              value={chartNumber}
              onChange={(e) => setChartNumber(e.target.value)}
              placeholder="例: 12345"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">検査項目（複数選択可）</label>
            <div className="grid grid-cols-2 gap-3">
              {KIT_CONFIGS.map((config) => {
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

          {hasAnyStockIssue && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-800 mb-1">在庫不足の警告</p>
                  <p className="text-sm text-yellow-700">
                    選択された項目の一部で在庫がありません。予約は登録されますが、入荷後に割り当てられます。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedKits.length === 0}
              className="flex-1 px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '登録中...' : `予約 (${selectedKits.length}件)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
