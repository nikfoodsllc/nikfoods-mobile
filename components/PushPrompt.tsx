import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Sheet, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { askForPush, markAsked, pushState, registerPush, wasAskedBefore } from '@/lib/push';

/**
 * Asked once, right after an order (the moment a customer cares about updates): "Get order updates?". Yes shows iOS's own
 * question. Not now is remembered and it is not asked again (they can turn it on in Account > Notifications).
 */
export default function PushPrompt() {
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!user || wasAskedBefore()) return;
      if ((await pushState()) === 'undetermined' && live) setOpen(true);
    })();
    return () => {
      live = false;
    };
  }, [user]);

  const yes = async () => {
    setBusy(true);
    const state = await askForPush();
    if (state === 'granted') await registerPush(authenticatedFetch);
    setBusy(false);
    setOpen(false);
  };
  const no = () => {
    markAsked();
    setOpen(false);
  };

  return (
    <Sheet visible={open} onClose={no} title="Get order updates?">
      <View style={{ gap: S.lg, paddingBottom: S.lg }}>
        <Text size={15} color={C.body}>We will tell you when your order is confirmed, on its way and delivered.</Text>
        <Button label="Turn on" onPress={yes} loading={busy} />
        <Button label="Not now" variant="ghost" onPress={no} />
      </View>
    </Sheet>
  );
}
