import { useState, useEffect } from 'react';
import { Plus, Package, ShoppingCart } from 'lucide-react';
import { StockCard } from './StockCard';
import { ReceiveModal } from './ReceiveModal';
import { ReserveModal } from './ReserveModal';
import { ReservationList } from './ReservationList';
import { ReservedDetailModal } from './ReservedDetailModal';
import { StockManagementModal } from './StockManagementModal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { PurchaseOrderList } from './PurchaseOrderList';
import { fetchLots, fetchReservations } from '../services/inventory';
import { calculateStockInfo } from '../utils/stock';
import { KIT_CONFIGS } from '../constants/kits';
import type { Lot, Reservation, KitType } from '../types';

export function Dashboard() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isReservedDetailModalOpen, setIsReservedDetailModalOpen] = useState(false);
  const [isStockManagementModalOpen, setIsStockManagementModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [purchaseOrderRefresh, setPurchaseOrderRefresh] = useState(0);
  const [selectedKitType, setSelectedKitType] = useState<KitType | undefined>();
  const [selectedKitForDetail, setSelectedKitForDetail] = useState<{ type: KitType; name: string } | null>(null);
  const [selectedKitForManagement, setSelectedKitForManagement] = useState<{ type: KitType; stock: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [lotsData, reservationsData] = await Promise.all([
        fetchLots(),
        fetchReservations(),
      ]);
      setLots(lotsData);
      setReservations(reservationsData);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReceive = (kitType?: KitType) => {
    setSelectedKitType(kitType);
    setIsReceiveModalOpen(true);
  };

  const handleCloseReceiveModal = () => {
    setIsReceiveModalOpen(false);
    setSelectedKitType(undefined);
  };

  const handleShowReservedDetails = (kitType: KitType, kitName: string) => {
    setSelectedKitForDetail({ type: kitType, name: kitName });
    setIsReservedDetailModalOpen(true);
  };

  const handleCloseReservedDetailModal = () => {
    setIsReservedDetailModalOpen(false);
    setSelectedKitForDetail(null);
  };

  const handleManageStock = (kitType: KitType, stock: number) => {
    setSelectedKitForManagement({ type: kitType, stock });
    setIsStockManagementModalOpen(true);
  };

  const handleCloseStockManagementModal = () => {
    setIsStockManagementModalOpen(false);
    setSelectedKitForManagement(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">オルコア検査キット</h1>
                <p className="text-sm text-gray-300">在庫管理システム</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPurchaseOrderModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                発注登録
              </button>
              <button
                onClick={() => setIsReserveModalOpen(true)}
                className="flex items-center gap-2 px-6 py-4 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-lg transition-colors"
              >
                <Plus className="w-6 h-6" />
                予約登録
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">在庫状況</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {KIT_CONFIGS.map((config) => {
              const stockInfo = calculateStockInfo(
                lots,
                reservations,
                config.type,
                config.buffer
              );
              return (
                <StockCard
                  key={config.type}
                  config={config}
                  stockInfo={stockInfo}
                  onReceive={() => handleReceive(config.type)}
                  onShowReservedDetails={() => handleShowReservedDetails(config.type, config.name)}
                  onManageStock={() => handleManageStock(config.type, stockInfo.available)}
                  isPriority={config.priority === 1}
                />
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">発注履歴</h2>
          <PurchaseOrderList onRefresh={purchaseOrderRefresh} />
        </section>

        <section>
          <ReservationList
            reservations={reservations}
            onUpdate={loadData}
          />
        </section>
      </main>

      <ReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={handleCloseReceiveModal}
        onSuccess={loadData}
        preselectedKitType={selectedKitType}
      />

      <ReserveModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        onSuccess={loadData}
        lots={lots}
      />

      <ReservedDetailModal
        isOpen={isReservedDetailModalOpen}
        onClose={handleCloseReservedDetailModal}
        onUpdate={loadData}
        kitType={selectedKitForDetail?.type || 'pg1000'}
        kitName={selectedKitForDetail?.name || ''}
        reservations={reservations}
        lots={lots}
      />

      <StockManagementModal
        isOpen={isStockManagementModalOpen}
        onClose={handleCloseStockManagementModal}
        onSuccess={loadData}
        kitType={selectedKitForManagement?.type || 'pg1000'}
        currentStock={selectedKitForManagement?.stock || 0}
      />

      <PurchaseOrderModal
        isOpen={isPurchaseOrderModalOpen}
        onClose={() => setIsPurchaseOrderModalOpen(false)}
        onSuccess={() => {
          setPurchaseOrderRefresh(prev => prev + 1);
        }}
      />
    </div>
  );
}
