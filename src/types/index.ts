import type { Database } from '../lib/database.types';

export type Lot = Database['public']['Tables']['lots']['Row'];
export type Reservation = Database['public']['Tables']['reservations']['Row'];
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
export type KitType = Database['public']['Tables']['lots']['Row']['kit_type'];
export type ReservationStatus = Database['public']['Tables']['reservations']['Row']['status'];
export type PurchaseOrderStatus = Database['public']['Tables']['purchase_orders']['Row']['status'];

export interface StockInfo {
  kitType: KitType;
  available: number;
  reserved: number;
  expiringSoon: number;
  shouldOrder: boolean;
  orderQuantity: number;
}

export interface KitConfig {
  type: KitType;
  name: string;
  buffer: number;
  color: string;
  priority: number;
}
