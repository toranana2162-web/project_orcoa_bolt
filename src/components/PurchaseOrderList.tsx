import React, { useEffect, useState } from 'react';
import { Package, Calendar, Truck, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import type { PurchaseOrder } from '../types';
import { getPurchaseOrders, deletePurchaseOrder } from '../services/purchaseOrders';
import { KIT_CONFIGS } from '../constants/kits';

interface PurchaseOrderListProps {
  onRefresh?: number;
}

export function PurchaseOrderList({ onRefresh }: PurchaseOrderListProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [onRefresh]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrders();
      setOrders(data);
    } catch (error) {
      console.error('発注履歴の読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この発注を削除してもよろしいですか？')) return;

    try {
      await deletePurchaseOrder(id);
      loadOrders();
    } catch (error) {
      console.error('発注の削除に失敗しました:', error);
    }
  };

  const getKitName = (kitType: string) => {
    return KIT_CONFIGS.find((k) => k.type === kitType)?.name || kitType;
  };

  const getKitColor = (kitType: string) => {
    return KIT_CONFIGS.find((k) => k.type === kitType)?.color || 'bg-blue-500';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ordered: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      ordered: '発注済み',
      received: '入荷済み',
      cancelled: 'キャンセル',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        発注履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${getKitColor(order.kit_type)} rounded-lg`}>
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{getKitName(order.kit_type)}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(order.status)}
                  {order.lot_number && (
                    <span className="text-xs text-gray-600">
                      ロット: {order.lot_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {order.status === 'ordered' && (
                <button
                  onClick={() => handleDelete(order.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>発注日: {formatDate(order.order_date)}</span>
            </div>
            {order.expected_delivery_date && (
              <div className="flex items-center gap-2 text-gray-600">
                <Truck className="w-4 h-4" />
                <span>納品予定: {formatDate(order.expected_delivery_date)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
            <div className="text-gray-700">
              発注数量: <span className="font-semibold">{order.quantity}</span>
            </div>
            {order.status === 'received' && (
              <div className="text-green-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>入荷済み: <span className="font-semibold">{order.received_quantity}</span></span>
              </div>
            )}
          </div>

          {order.supplier && (
            <div className="mt-2 text-sm text-gray-600">
              仕入先: {order.supplier}
            </div>
          )}

          {order.notes && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
              {order.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
