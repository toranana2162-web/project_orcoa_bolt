import { AlertCircle, Package, Clock, ShoppingCart, Settings, ExternalLink } from 'lucide-react';
import type { StockInfo } from '../types';
import type { KitConfig } from '../types';

interface StockCardProps {
  config: KitConfig;
  stockInfo: StockInfo;
  onReceive: () => void;
  onShowReservedDetails: () => void;
  onManageStock: () => void;
  isPriority?: boolean;
}

export function StockCard({ config, stockInfo, onReceive, onShowReservedDetails, onManageStock, isPriority }: StockCardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl shadow-md p-6 border-2 transition-all hover:shadow-lg
        ${isPriority ? 'border-blue-500' : 'border-gray-200'}
        ${stockInfo.shouldOrder ? 'ring-4 ring-red-200' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${config.color} rounded-lg flex items-center justify-center`}>
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${isPriority ? 'text-2xl' : 'text-xl'}`}>
              {config.name}
            </h3>
            {isPriority && (
              <span className="text-xs text-blue-600 font-semibold">最重要キット</span>
            )}
          </div>
        </div>
        {stockInfo.shouldOrder && (
          <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600 font-bold text-sm">発注推奨</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <button
          onClick={onManageStock}
          className="bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors text-left cursor-pointer"
        >
          <div className="text-sm text-gray-600 mb-1">使用可能</div>
          <div className="text-3xl font-bold text-green-600">{stockInfo.available}</div>
          <div className="text-xs text-green-600 mt-1">タップして在庫管理</div>
        </button>
        <button
          onClick={onShowReservedDetails}
          className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors text-left cursor-pointer"
        >
          <div className="text-sm text-gray-600 mb-1">取り置き中</div>
          <div className="text-3xl font-bold text-blue-600">{stockInfo.reserved}</div>
          {stockInfo.reserved > 0 && (
            <div className="text-xs text-blue-600 mt-1">タップして詳細表示</div>
          )}
        </button>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>期限30日以内</span>
          </div>
          <div className="text-3xl font-bold text-orange-600">{stockInfo.expiringSoon}</div>
        </div>
      </div>

      {stockInfo.shouldOrder && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-600">発注が必要です</span>
          </div>
          <div className="text-sm text-gray-700 mb-3">
            推奨発注数: <span className="font-bold text-lg text-red-600">{stockInfo.orderQuantity}個</span>
          </div>
          <div className="text-xs text-gray-600 mb-1">
            （今後30日間の予約 + バッファ{config.buffer}個を考慮）
          </div>
          <div className="text-xs text-gray-600 mb-3 pb-3 border-b border-red-200">
            ※各キット最低5個から、合計10個以上で発注可能
          </div>
          <a
            href="https://orcoa.net/clinics/clinic_login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            発注フォームを開く
          </a>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onReceive}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Package className="w-5 h-5" />
          入荷登録
        </button>
        <button
          onClick={onManageStock}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="w-5 h-5" />
          在庫管理
        </button>
      </div>
    </div>
  );
}
