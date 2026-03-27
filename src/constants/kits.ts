import type { KitConfig } from '../types';

export const KIT_CONFIGS: KitConfig[] = [
  {
    type: 'pg1000',
    name: 'PG1000',
    buffer: 2,
    color: 'bg-blue-500',
    priority: 1,
  },
  {
    type: 'td1000',
    name: 'TD1000',
    buffer: 1,
    color: 'bg-green-500',
    priority: 2,
  },
  {
    type: 'tf1000',
    name: 'TF1000',
    buffer: 1,
    color: 'bg-yellow-500',
    priority: 3,
  },
  {
    type: 'pg2000',
    name: 'PG2000',
    buffer: 1,
    color: 'bg-red-500',
    priority: 4,
  },
];

export const ORDER_UNIT = 5;
export const MIN_ORDER_PER_KIT = 5;
export const MIN_TOTAL_ORDER = 10;
export const DELIVERY_DAYS = 7;
export const RESERVATION_FORECAST_DAYS = 30;
export const EXPIRY_WARNING_DAYS = 30;
export const DEFAULT_EXPIRY_MONTHS = 3;
