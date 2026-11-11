import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { dayLabel } from '@/components/OrderParts';
import { Button, Card, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useApiClient } from '@/hooks/useApiClient';

export interface Tracking {
  state: 'none' | 'later' | 'today' | 'on_the_way' | 'delivered' | 'not_delivered';
  date?: string;
  etaFrom?: string;
  etaTo?: string;
  deliveredAt?: string;
  trackingUrl?: string;
}

const REFRESH_MS = 60_000;

/** '17:12' -> '5:12 PM' */
export function clock(hhmm?: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Where today's delivery stands. Shows nothing unless the order is delivered today (or was delivered). */
export default function DeliveryTracker({ orderId, onState }: { orderId: string; onState?: (t: Tracking | null) => void }) {
  const { authenticatedFetch } = useApiClient();
  const [t, setT] = useState<Tracking | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await authenticatedFetch(`/api/orders/${encodeURIComponent(orderId)}/delivery-tracking`);
      const j = await r.json();
      if (r.ok && j?.data) {
        setT(j.data as Tracking);
        onState?.(j.data as Tracking);
      }
    } catch {
      // keep what is shown; the next refresh tries again
    }
  }, [authenticatedFetch, orderId, onState]);

  // look when the screen is shown, then every minute while it is in view and the delivery is under way
  useFocusEffect(
    useCallback(() => {
      void load();
      timer.current = setInterval(() => void load(), REFRESH_MS);
      return () => {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
      };
    }, [load])
  );
  useEffect(() => {
    if (t && (t.state === 'delivered' || t.state === 'none' || t.state === 'later') && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, [t]);

  if (!t || t.state === 'none' || t.state === 'later') return null;

  // which delivery day this is about: an order can have several, and only one is tracked at a time
  const day = t.date ? dayLabel(t.date) : '';
  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => void Linking.openURL(url));

  if (t.state === 'delivered') {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Ionicons name="checkmark-circle" size={26} color={C.green} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" size={16} color={C.green}>{t.deliveredAt ? `Delivered at ${clock(t.deliveredAt)}` : 'Delivered'}</Text>
          {!!day && <Text size={13} color={C.muted}>{`${day} delivery`}</Text>}
        </View>
      </Card>
    );
  }
  if (t.state === 'not_delivered') {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Ionicons name="alert-circle" size={26} color={C.red} />
        <View style={{ flex: 1 }}>
          <Text weight="semibold" size={15} color={C.red}>We could not complete this delivery. Please contact us.</Text>
          {!!day && <Text size={13} color={C.muted}>{`${day} delivery`}</Text>}
        </View>
      </Card>
    );
  }
  const onTheWay = t.state === 'on_the_way';
  return (
    <Card style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Ionicons name={onTheWay ? 'bicycle' : 'time-outline'} size={26} color={C.brandDark} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" size={17}>{onTheWay ? 'On the way' : 'Delivery today'}</Text>
          {!!day && <Text size={13} color={C.muted}>{day}</Text>}
          {onTheWay && t.etaFrom && t.etaTo ? (
            <Text size={15} color={C.body}>Arriving {clock(t.etaFrom)} – {clock(t.etaTo)}</Text>
          ) : (
            <Text size={14} color={C.muted}>{onTheWay ? 'Your driver is on the way' : 'We show the arrival time once your driver starts'}</Text>
          )}
        </View>
      </View>
      {onTheWay && !!t.trackingUrl && <Button label="Track live" variant="outline" onPress={() => void open(t.trackingUrl as string)} />}
    </Card>
  );
}
