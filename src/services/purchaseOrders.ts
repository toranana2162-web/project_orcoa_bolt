import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];

export async function createPurchaseOrder(order: PurchaseOrderInsert) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPurchaseOrders() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPurchaseOrdersByKitType(kitType: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('kit_type', kitType)
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActivePurchaseOrders() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('status', 'ordered')
    .order('expected_delivery_date', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updatePurchaseOrder(id: string, updates: PurchaseOrderUpdate) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePurchaseOrder(id: string) {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function markPurchaseOrderAsReceived(id: string, receivedQuantity: number) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({
      status: 'received',
      received_quantity: receivedQuantity
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
