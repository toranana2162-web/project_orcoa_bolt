export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type KitType = 'pg1000' | 'td1000' | 'tf1000' | 'pg2000';
export type ReservationStatus = 'reserved' | 'used' | 'cancelled';
export type PurchaseOrderStatus = 'ordered' | 'received' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      lots: {
        Row: {
          id: string;
          kit_type: KitType;
          lot_number: string;
          quantity: number;
          reserved: number;
          used: number;
          expiry_date: string;
          received_date: string;
          created_at: string;
          purchase_order_id: string | null;
        };
        Insert: {
          id?: string;
          kit_type: KitType;
          lot_number: string;
          quantity: number;
          reserved?: number;
          used?: number;
          expiry_date: string;
          received_date?: string;
          created_at?: string;
          purchase_order_id?: string | null;
        };
        Update: {
          id?: string;
          kit_type?: KitType;
          lot_number?: string;
          quantity?: number;
          reserved?: number;
          used?: number;
          expiry_date?: string;
          received_date?: string;
          created_at?: string;
          purchase_order_id?: string | null;
        };
      };
      reservations: {
        Row: {
          id: string;
          examination_date: string;
          chart_number: string;
          kit_type: KitType;
          status: ReservationStatus;
          lot_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          examination_date: string;
          chart_number: string;
          kit_type: KitType;
          status?: ReservationStatus;
          lot_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          examination_date?: string;
          chart_number?: string;
          kit_type?: KitType;
          status?: ReservationStatus;
          lot_id?: string | null;
          created_at?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          kit_type: KitType;
          order_date: string;
          expected_delivery_date: string | null;
          quantity: number;
          lot_number: string | null;
          supplier: string | null;
          notes: string | null;
          status: PurchaseOrderStatus;
          received_quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kit_type: KitType;
          order_date?: string;
          expected_delivery_date?: string | null;
          quantity: number;
          lot_number?: string | null;
          supplier?: string | null;
          notes?: string | null;
          status?: PurchaseOrderStatus;
          received_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kit_type?: KitType;
          order_date?: string;
          expected_delivery_date?: string | null;
          quantity?: number;
          lot_number?: string | null;
          supplier?: string | null;
          notes?: string | null;
          status?: PurchaseOrderStatus;
          received_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
