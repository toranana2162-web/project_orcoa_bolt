import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import type { KitType, PurchaseOrder } from '../types';
import { createLot } from '../services/inventory';
import { addMonths, dateToInputValue } from '../utils/stock';
import { DEFAULT_EXPIRY_MONTHS } from '../constants/kits';
import { KIT_CONFIGS } from '../constants/kits';
import { getActivePurchaseOrders, markPurchaseOrderAsReceived } from '../services/purchaseOrders';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedKitType?: KitType;
}

export function ReceiveModal({ isOpen, onClose, onSuccess, preselectedKitType }: ReceiveModalProps) {
  const [kitType, setKitType] = useState<KitType>('pg1000');
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState(5);
  const defaultExpiry = addMonths(new Date(), DEFAULT_EXPIRY_MONTHS);
  const [expiryDate, setExpiryDate] = useState(dateToInputValue(defaultExpiry));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string>('');

  useEffect(() => {
    if (isOpen && preselectedKitType) {
      setKitType(preselectedKitType);
    }
  }, [isOpen, preselectedKitType]);

  useEffect(() => {
    if (isOpen) {
      loadPurchaseOrders();
    }
  }, [isOpen]);

  const loadPurchaseOrders = async () => {
    try {
      const data = await getActivePurchaseOrders();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('発注履歴の読み込みに失敗しました:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lotNumber.trim()) {
      alert('LOT番号を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      await createLot(
        kitType,
        quantity,
        expiryDate,
        lotNumber.trim(),
        selectedPurchaseOrderId || null
      );

      if (selectedPurchaseOrderId) {
        await markPurchaseOrderAsReceived(selectedPurchaseOrderId, quantity);
      }

      onSuccess();
      onClose();
      setLotNumber('');
      setQuantity(5);
      setExpiryDate(dateToInputValue(addMonths(new Date(), DEFAULT_EXPIRY_MONTHS)));
      setSelectedPurchaseOrderId('');
    } catch (error) {
      console.error('入荷登録エラー:', error);
      alert('入荷登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">入荷登録</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {purchaseOrders.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-3">発注履歴から選択（任意）</label>
              <select
                value={selectedPurchaseOrderId}
                onChange={(e) => {
                  const orderId = e.target.value;
                  setSelectedPurchaseOrderId(orderId);
                  if (orderId) {
                    const order = purchaseOrders.find(o => o.id === orderId);
                    if (order) {
                      setKitType(order.kit_type);
                      setQuantity(order.quantity);
                      if (order.lot_number) setLotNumber(order.lot_number);
                    }
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">発注履歴と紐づけない</option>
                {purchaseOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {KIT_CONFIGS.find(k => k.type === order.kit_type)?.name} - {order.quantity}個
                    {order.expected_delivery_date && ` (納品予定: ${new Date(order.expected_delivery_date).toLocaleDateString('ja-JP')})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-3">キット種類</label>
            <div className="grid grid-cols-2 gap-3">
              {KIT_CONFIGS.map((config) => (
                <button
                  key={config.type}
                  type="button"
                  onClick={() => setKitType(config.type)}
                  className={`
                    p-4 rounded-lg border-2 font-bold transition-all
                    ${kitType === config.type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {config.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">LOT番号</label>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="LOT-2024-001"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-600 mt-2">
              製品パッケージに記載されたLOT番号を入力してください
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">数量（5個単位）</label>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`
                    py-4 rounded-lg border-2 font-bold text-lg transition-all
                    ${quantity === qty
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {qty}個
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">有効期限</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-600 mt-2">
              デフォルト: 入荷日から3ヶ月後
            </p>
          </div>

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
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '登録中...' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
