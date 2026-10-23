import { PST_TIMEZONE } from '@/lib/timezone';
import { Order, OrderDay } from '@/types/order';

/** Today's date in the delivery time zone, 'YYYY-MM-DD'. */
export function todayPacific(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: PST_TIMEZONE });
}

/** The day an order day is delivered, 'YYYY-MM-DD'. */
export function deliveryDay(d: Pick<OrderDay, 'actualDeliveryDate' | 'deliveryDate'>): string {
  return String(d.actualDeliveryDate || d.deliveryDate).slice(0, 10);
}

/**
 * The delivery the home card shows: of the orders given, the one with the soonest delivery day that is today or later,
 * and that day. A day that has passed is never shown, even when the order has not been marked delivered.
 */
export function pickNextDelivery(orders: Order[], today: string): { order: Order; day: OrderDay } | null {
  let best: { order: Order; day: OrderDay; date: string } | null = null;
  for (const order of orders) {
    for (const day of order.items ?? []) {
      const date = deliveryDay(day);
      if (!date || date < today) continue;
      if (!best || date < best.date) best = { order, day, date };
    }
  }
  return best ? { order: best.order, day: best.day } : null;
}
