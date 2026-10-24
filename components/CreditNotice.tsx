import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '@/constants/theme';
import { Text } from '@/components/ui';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/orderHelpers';
import { cardTotalOf, isFullyCredited, toCents } from '@/lib/storeCredit';

const dayText = (value: Date | string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

export const paidByCreditOnly = (o: Pick<Order, 'totalPaid' | 'storeCreditUsed' | 'storeCreditState'>) =>
  (o.storeCreditUsed ?? 0) > 0 && o.storeCreditState !== 'released' && toCents(o.storeCreditUsed ?? 0) >= toCents(o.totalPaid);
export const usedCredit = (o: Pick<Order, 'storeCreditUsed' | 'storeCreditState'>) => (o.storeCreditUsed ?? 0) > 0 && o.storeCreditState !== 'released';

/** Green tiles on an order: paid with store credit, and store credit added for the order (a full credit shows only the total). */
export default function CreditNotice({ order, showUsed = true }: { order: Order; showUsed?: boolean }) {
  const issued = order.creditsIssued ?? [];
  const used = showUsed && usedCredit(order);
  if (!used && issued.length === 0) return null;
  const full = isFullyCredited(order);

  const tile = (key: string, title: string, amount: string, lines: Array<{ text: string; amount: number }>, note?: string) => (
    <View key={key} style={{ flexDirection: 'row', gap: S.md, backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenLine, borderRadius: R.md, padding: S.md, marginTop: S.sm }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="wallet-outline" size={18} color="#166534" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md }}>
          <Text weight="bold" size={14} color="#14532D" style={{ flex: 1 }}>{title}</Text>
          <Text weight="bold" size={14} color="#14532D">{amount}</Text>
        </View>
        {!!note && <Text size={13} color="#14532D" style={{ fontStyle: 'italic', marginTop: 2 }}>{note}</Text>}
        {lines.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md, marginTop: 2 }}>
            <Text size={13} color="#166534" style={{ flex: 1 }}>{l.text}</Text>
            <Text size={13} color="#166534">{formatCurrency(l.amount, order.currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View>
      {used && tile('used', paidByCreditOnly(order) ? 'Paid with store credit' : 'Store credit used', formatCurrency(order.storeCreditUsed ?? 0, order.currency), paidByCreditOnly(order) ? [] : [{ text: 'Paid by card', amount: cardTotalOf(order) }])}
      {issued.map((c, i) =>
        tile(
          `issued-${i}`,
          `Store credit added · ${dayText(c.at)}`,
          `+${formatCurrency(c.amount, order.currency)}`,
          full ? [] : [...c.items.map((it) => ({ text: it.quantity > 1 ? `${it.name} x ${it.quantity}` : it.name, amount: it.amount })), ...(c.fee ? [{ text: 'Platform Fee', amount: c.fee }] : []), ...(c.tip ? [{ text: 'Tip', amount: c.tip }] : [])],
          c.note
        )
      )}
    </View>
  );
}
