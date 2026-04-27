import type { Lot, Reservation, KitType, StockInfo } from '../types';
import { ORDER_UNIT, MIN_ORDER_PER_KIT, DELIVERY_DAYS, RESERVATION_FORECAST_DAYS, EXPIRY_WARNING_DAYS } from '../constants/kits';

export function calculateAvailableStock(lot: Lot): number;
export function calculateAvailableStock(lots: Lot[], kitType: KitType): number;
export function calculateAvailableStock(lotOrLots: Lot | Lot[], kitType?: KitType): number {
  if (Array.isArray(lotOrLots)) {
    const kitLots = lotOrLots.filter(l => l.kit_type === kitType && !isExpired(l.expiry_date));
    return kitLots.reduce((sum, lot) => {
      return sum + (lot.quantity - lot.reserved - lot.used);
    }, 0);
  }
  return lotOrLots.quantity - lotOrLots.reserved - lotOrLots.used;
}

export function isExpiringSoon(expiryDate: string, days: number = EXPIRY_WARNING_DAYS): boolean {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
}

export function isExpired(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const today = new Date();
  return expiry < today;
}

export function getUpcomingReservations(
  reservations: Reservation[],
  kitType: KitType,
  days: number = DELIVERY_DAYS
): Reservation[] {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  return reservations.filter(r => {
    if (r.kit_type !== kitType || r.status !== 'reserved') return false;
    const examDate = new Date(r.examination_date);
    return examDate >= today && examDate <= futureDate;
  });
}

export function calculateStockInfo(
  lots: Lot[],
  reservations: Reservation[],
  kitType: KitType,
  buffer: number
): StockInfo {
  const kitLots = lots.filter(l => l.kit_type === kitType && !isExpired(l.expiry_date));

  const available = kitLots.reduce((sum, lot) => sum + calculateAvailableStock(lot), 0);
  // 予約テーブル件数を表示の正とする（lot.reserved と不整合が起きやすいため）
  const reserved = reservations.filter(
    (r) => r.kit_type === kitType && r.status === 'reserved'
  ).length;
  const expiringSoon = kitLots
    .filter(lot => isExpiringSoon(lot.expiry_date))
    .reduce((sum, lot) => sum + calculateAvailableStock(lot), 0);

  const upcomingReservations = getUpcomingReservations(reservations, kitType, RESERVATION_FORECAST_DAYS);
  const upcomingCount = upcomingReservations.length;

  const requiredStock = upcomingCount + buffer;
  const shouldOrder = available < requiredStock;
  const shortage = Math.max(0, requiredStock - available);
  const orderQuantity = shouldOrder ? Math.max(MIN_ORDER_PER_KIT, Math.ceil(shortage / ORDER_UNIT) * ORDER_UNIT) : 0;

  return {
    kitType,
    available,
    reserved,
    expiringSoon,
    shouldOrder,
    orderQuantity,
  };
}

export function findBestLotForReservation(lots: Lot[], kitType: KitType): Lot | null {
  const availableLots = lots
    .filter(l =>
      l.kit_type === kitType &&
      !isExpired(l.expiry_date) &&
      calculateAvailableStock(l) > 0
    )
    .sort((a, b) => {
      const dateA = new Date(a.expiry_date);
      const dateB = new Date(b.expiry_date);
      return dateA.getTime() - dateB.getTime();
    });

  return availableLots.length > 0 ? availableLots[0] : null;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function dateToInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
