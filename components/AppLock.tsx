import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { authenticate, isLockEnabled, lockSupport, shouldRelock } from '@/lib/biometrics';

/**
 * Covers the app until the phone confirms it is the owner, when the customer turned the lock on (Account > Face ID) and is
 * signed in: when the app opens, and when it comes back after more than 30 seconds away. Also hides the screen in the app switcher.
 */
export default function AppLock({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const [label, setLabel] = useState('Face ID');
  const leftAt = useRef<number | null>(null);
  const checkedStart = useRef(false);
  const asking = useRef(false);

  const unlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    const support = await lockSupport();
    setLabel(support.label);
    // no biometrics or passcode set up any more: do not lock the customer out of their own app
    const ok = support.available ? await authenticate('Unlock NikFoods') : true;
    asking.current = false;
    if (ok) setLocked(false);
  }, []);

  // when the app opens: lock if it is turned on and someone is signed in
  useEffect(() => {
    if (checkedStart.current || !user) return;
    checkedStart.current = true;
    if (isLockEnabled()) {
      setLocked(true);
      void unlock();
    }
  }, [user, unlock]);

  // leaving and coming back
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setCovered(false);
        if (user && isLockEnabled() && shouldRelock(leftAt.current)) {
          setLocked(true);
          void unlock();
        }
        leftAt.current = null;
      } else {
        // 'inactive' also happens for a moment during the Face ID question: only note the time when really leaving
        if (state === 'background') leftAt.current = Date.now();
        if (user && isLockEnabled()) setCovered(true);
      }
    });
    return () => sub.remove();
  }, [user, unlock]);

  // signing out lifts the lock
  useEffect(() => {
    if (!user) {
      setLocked(false);
      setCovered(false);
    }
  }, [user]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {(locked || covered) && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.lg }} accessibilityViewIsModal>
          <Ionicons name="lock-closed" size={44} color={C.brandDark} />
          <Text weight="bold" size={22}>NikFoods is locked</Text>
          {locked && <Button label={`Unlock with ${label}`} onPress={() => void unlock()} />}
        </View>
      )}
    </View>
  );
}
