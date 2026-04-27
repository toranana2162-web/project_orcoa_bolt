import { supabase } from '../lib/supabase';
import type { KitType, Lot, Reservation } from '../types';
import { findBestLotForReservation, calculateAvailableStock } from '../utils/stock';

export async function fetchLots(): Promise<Lot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .order('expiry_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('examination_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createLot(
  kitType: KitType,
  quantity: number,
  expiryDate: string,
  lotNumber: string,
  purchaseOrderId?: string | null
): Promise<Lot> {
  const { data, error } = await supabase
    .from('lots')
    .insert({
      kit_type: kitType,
      lot_number: lotNumber,
      quantity,
      expiry_date: expiryDate,
      reserved: 0,
      used: 0,
      purchase_order_id: purchaseOrderId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createReservation(
  examinationDate: string,
  chartNumber: string,
  kitType: KitType,
  lots: Lot[]
): Promise<Reservation> {
  const bestLot = findBestLotForReservation(lots, kitType);

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .insert({
      examination_date: examinationDate,
      chart_number: chartNumber,
      kit_type: kitType,
      status: 'reserved',
      lot_id: bestLot?.id || null,
    })
    .select()
    .single();

  if (reservationError) throw reservationError;

  if (bestLot) {
    const { error: lotError } = await supabase
      .from('lots')
      .update({ reserved: bestLot.reserved + 1 })
      .eq('id', bestLot.id);

    if (lotError) throw lotError;
  }

  return reservation;
}

export async function markReservationAsUsed(reservationId: string): Promise<void> {
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*, lots(*)')
    .eq('id', reservationId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!reservation) throw new Error('予約が見つかりません');

  const { error: reservationError } = await supabase
    .from('reservations')
    .update({ status: 'used' })
    .eq('id', reservationId);

  if (reservationError) throw reservationError;

  // 在庫が足りず lot_id が付いていない予約でも、予約は使用済みにできる
  if (!reservation.lot_id) return;

  const { data: lot, error: lotFetchError } = await supabase
    .from('lots')
    .select('*')
    .eq('id', reservation.lot_id)
    .single();

  if (lotFetchError) throw lotFetchError;

  const { error: lotError } = await supabase
    .from('lots')
    .update({
      reserved: Math.max(0, lot.reserved - 1),
      used: lot.used + 1,
    })
    .eq('id', reservation.lot_id);

  if (lotError) throw lotError;
}

export async function cancelReservation(reservationId: string): Promise<void> {
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!reservation) return;

  const { error: reservationError } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId);

  if (reservationError) throw reservationError;

  if (reservation.lot_id) {
    const { data: lot, error: lotFetchError } = await supabase
      .from('lots')
      .select('*')
      .eq('id', reservation.lot_id)
      .single();

    if (lotFetchError) throw lotFetchError;

    const { error: lotError } = await supabase
      .from('lots')
      .update({ reserved: lot.reserved - 1 })
      .eq('id', reservation.lot_id);

    if (lotError) throw lotError;
  }
}

export async function adjustStock(
  kitType: KitType,
  adjustment: number,
  reason: string
): Promise<void> {
  if (adjustment > 0) {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 18);
    const expiryString = expiryDate.toISOString().split('T')[0];

    const timestamp = Date.now();
    const generatedLotNumber = `${kitType.toUpperCase()}-AUTO-${timestamp}`;

    await createLot(kitType, adjustment, expiryString, generatedLotNumber);
  } else if (adjustment < 0) {
    const lots = await fetchLots();
    const availableLots = lots
      .filter((lot) => lot.kit_type === kitType)
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    let remaining = Math.abs(adjustment);

    for (const lot of availableLots) {
      if (remaining === 0) break;

      const available = calculateAvailableStock(lot);
      if (available <= 0) continue;

      const toAdjust = Math.min(remaining, available);

      const { error } = await supabase
        .from('lots')
        .update({ used: lot.used + toAdjust })
        .eq('id', lot.id);

      if (error) throw error;

      remaining -= toAdjust;
    }

    if (remaining > 0) {
      throw new Error('在庫が不足しています');
    }
  }
}

export async function updateLot(
  lotId: string,
  updates: { quantity?: number; expiry_date?: string }
): Promise<void> {
  if (updates.quantity !== undefined) {
    const { data: lot, error: fetchError } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    if (fetchError) throw fetchError;

    if (updates.quantity < lot.reserved + lot.used) {
      throw new Error('総数量は取り置き中と使用済みの合計より少なくできません');
    }
  }

  const { error } = await supabase
    .from('lots')
    .update(updates)
    .eq('id', lotId);

  if (error) throw error;
}

export async function deleteLot(lotId: string): Promise<void> {
  const { error } = await supabase
    .from('lots')
    .delete()
    .eq('id', lotId);

  if (error) throw error;
}

export async function incrementLotStock(
  lotId: string,
  field: 'quantity' | 'reserved' | 'used',
  amount: number = 1
): Promise<void> {
  const { data: lot, error: fetchError } = await supabase
    .from('lots')
    .select('*')
    .eq('id', lotId)
    .single();

  if (fetchError) throw fetchError;

  const newValue = lot[field] + amount;

  if (field === 'reserved') {
    if (lot.reserved + amount + lot.used > lot.quantity) {
      throw new Error('取り置き中と使用済みの合計が総数量を超えることはできません');
    }
  } else if (field === 'used') {
    if (lot.reserved + lot.used + amount > lot.quantity) {
      throw new Error('取り置き中と使用済みの合計が総数量を超えることはできません');
    }
  }

  const { error } = await supabase
    .from('lots')
    .update({ [field]: newValue })
    .eq('id', lotId);

  if (error) throw error;
}

export async function decrementLotStock(
  lotId: string,
  field: 'quantity' | 'reserved' | 'used',
  amount: number = 1
): Promise<void> {
  const { data: lot, error: fetchError } = await supabase
    .from('lots')
    .select('*')
    .eq('id', lotId)
    .single();

  if (fetchError) throw fetchError;

  const newValue = lot[field] - amount;
  if (newValue < 0) {
    throw new Error('値を0未満にすることはできません');
  }

  if (field === 'quantity') {
    if (newValue < lot.reserved + lot.used) {
      throw new Error('総数量は取り置き中と使用済みの合計より少なくできません');
    }
  }

  if (field === 'reserved' && amount > 0) {
    const reservations = await fetchReservations();
    const lotReservations = reservations
      .filter((r) => r.lot_id === lotId && r.status === 'reserved')
      .sort((a, b) => new Date(b.examination_date).getTime() - new Date(a.examination_date).getTime());

    const toCancel = lotReservations.slice(0, amount);

    for (const reservation of toCancel) {
      const { error: cancelError } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', lot_id: null })
        .eq('id', reservation.id);

      if (cancelError) throw cancelError;
    }
  }

  const { error } = await supabase
    .from('lots')
    .update({ [field]: newValue })
    .eq('id', lotId);

  if (error) throw error;
}

export async function updateReservation(
  reservationId: string,
  updates: {
    chart_number?: string;
    examination_date?: string;
    kit_type?: KitType;
  }
): Promise<void> {
  const { data: currentReservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .single();

  if (fetchError) throw fetchError;

  if (updates.kit_type && updates.kit_type !== currentReservation.kit_type) {
    if (currentReservation.lot_id) {
      const { data: oldLot, error: oldLotFetchError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', currentReservation.lot_id)
        .single();

      if (oldLotFetchError) throw oldLotFetchError;

      const { error: oldLotUpdateError } = await supabase
        .from('lots')
        .update({ reserved: oldLot.reserved - 1 })
        .eq('id', currentReservation.lot_id);

      if (oldLotUpdateError) throw oldLotUpdateError;
    }

    const allLots = await fetchLots();
    const bestLot = findBestLotForReservation(allLots, updates.kit_type);

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        ...updates,
        lot_id: bestLot?.id || null,
      })
      .eq('id', reservationId);

    if (updateError) throw updateError;

    if (bestLot) {
      const { error: newLotUpdateError } = await supabase
        .from('lots')
        .update({ reserved: bestLot.reserved + 1 })
        .eq('id', bestLot.id);

      if (newLotUpdateError) throw newLotUpdateError;
    }
  } else {
    const { error: updateError } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', reservationId);

    if (updateError) throw updateError;
  }
}
