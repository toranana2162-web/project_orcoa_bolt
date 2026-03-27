import { useState, useEffect } from 'react';
import { X, Package, Edit2, Trash2, Save, AlertTriangle, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import type { KitType, Lot } from '../types';
import { fetchLots, updateLot, deleteLot, incrementLotStock, decrementLotStock } from '../services/inventory';
import { calculateAvailableStock } from '../utils/stock';
import { KIT_CONFIGS } from '../constants/kits';

interface StockManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kitType: KitType;
  currentStock: number;
}

export function StockManagementModal({
  isOpen,
  onClose,
  onSuccess,
  kitType,
}: StockManagementModalProps) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    quantity: number;
    expiry_date: string;
  }>({ quantity: 0, expiry_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLots();
    }
  }, [isOpen, kitType]);

  const loadLots = async () => {
    try {
      const allLots = await fetchLots();
      const filteredLots = allLots
        .filter((lot) => lot.kit_type === kitType)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
      setLots(filteredLots);
    } catch (error) {
      console.error('LOT読み込みエラー:', error);
    }
  };

  if (!isOpen) return null;

  const kitConfig = KIT_CONFIGS.find((k) => k.type === kitType);
  const totalAvailable = lots.reduce((sum, lot) => sum + calculateAvailableStock(lot), 0);
  const needsReorder = totalAvailable <= 10;

  const handleEdit = (lot: Lot) => {
    setEditingLotId(lot.id);
    setEditForm({
      quantity: lot.quantity,
      expiry_date: lot.expiry_date,
    });
  };

  const handleSave = async (lotId: string) => {
    setIsSubmitting(true);
    try {
      await updateLot(lotId, editForm);
      await loadLots();
      setEditingLotId(null);
      onSuccess();
    } catch (error) {
      console.error('LOT更新エラー:', error);
      alert('LOT更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (lotId: string) => {
    if (!confirm('このLOTを削除しますか？')) return;

    setIsSubmitting(true);
    try {
      await deleteLot(lotId);
      await loadLots();
      onSuccess();
    } catch (error) {
      console.error('LOT削除エラー:', error);
      alert('LOT削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrement = async (lotId: string, field: 'quantity' | 'reserved' | 'used') => {
    setIsSubmitting(true);
    try {
      await incrementLotStock(lotId, field);
      await loadLots();
      onSuccess();
    } catch (error) {
      console.error('在庫増加エラー:', error);
      alert('在庫の増加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecrement = async (lotId: string, field: 'quantity' | 'reserved' | 'used') => {
    setIsSubmitting(true);
    try {
      await decrementLotStock(lotId, field);
      await loadLots();
      onSuccess();
    } catch (error: any) {
      console.error('在庫減少エラー:', error);
      alert(error.message || '在庫の減少に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${kitConfig?.color} rounded-lg flex items-center justify-center`}>
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">在庫管理</h2>
              <p className="text-sm text-gray-600">{kitConfig?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {needsReorder && (
            <div className="mb-6 bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-800 mb-1">発注が必要です</h3>
                  <p className="text-sm text-orange-700 mb-3">
                    在庫が少なくなっています。早めの発注をお勧めします。
                  </p>
                  <a
                    href="https://orcoa.net/clinics/clinic_login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    発注フォームを開く
                  </a>
                </div>
              </div>
            </div>
          )}

          {lots.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">LOTが登録されていません</p>
              <p className="text-sm text-gray-400 mt-2">入荷登録からLOTを追加してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lots.map((lot) => {
                const available = calculateAvailableStock(lot);
                const isEditing = editingLotId === lot.id;
                const isExpired = new Date(lot.expiry_date) < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={lot.id}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      isExpired
                        ? 'border-red-500 bg-red-50 hover:border-red-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className={`font-bold text-lg ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                            {lot.lot_number}
                          </div>
                          {isExpired && (
                            <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                              期限切れ
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          入荷日: {new Date(lot.received_date).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                      {!isEditing && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(lot)}
                            disabled={isSubmitting}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lot.id)}
                            disabled={isSubmitting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            総数量
                          </label>
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e) =>
                              setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            有効期限
                          </label>
                          <input
                            type="date"
                            value={editForm.expiry_date}
                            onChange={(e) =>
                              setEditForm({ ...editForm, expiry_date: e.target.value })
                            }
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setEditingLotId(null)}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleSave(lot.id)}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? '保存中...' : '保存'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 px-3 py-2 rounded-lg">
                          <div className="text-xs text-gray-600 mb-1">総数量</div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-gray-800">{lot.quantity}個</div>
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleIncrement(lot.id, 'quantity')}
                                disabled={isSubmitting}
                                className="p-0.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDecrement(lot.id, 'quantity')}
                                disabled={isSubmitting}
                                className="p-0.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 px-3 py-2 rounded-lg">
                          <div className="text-xs text-blue-600 mb-1">使用可能</div>
                          <div className="font-bold text-blue-700">{available}個</div>
                        </div>
                        <div className="bg-yellow-50 px-3 py-2 rounded-lg">
                          <div className="text-xs text-yellow-600 mb-1">取り置き中</div>
                          <div className="font-bold text-yellow-700">{lot.reserved}個</div>
                        </div>
                        <div className={`px-3 py-2 rounded-lg ${
                          isExpired ? 'bg-red-100' : 'bg-purple-50'
                        }`}>
                          <div className={`text-xs mb-1 ${isExpired ? 'text-red-700' : 'text-purple-600'}`}>
                            有効期限
                          </div>
                          <div className={`font-bold text-sm ${isExpired ? 'text-red-700' : 'text-purple-700'}`}>
                            {new Date(lot.expiry_date).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
