import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S, shadow } from '@/constants/theme';
import { Text } from '@/components/ui';

type Kind = 'success' | 'error' | 'info';
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; kind: Kind; id: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: Kind = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, kind, id: Date.now() });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
      }, kind === 'error' ? 3800 : 2200);
    },
    [opacity]
  );

  const color = toast?.kind === 'error' ? C.red : toast?.kind === 'info' ? C.body : C.green;
  const icon = toast?.kind === 'error' ? 'alert-circle' : toast?.kind === 'info' ? 'information-circle' : 'checkmark-circle';

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: S.lg, right: S.lg, top: insets.top + 8, opacity, zIndex: 1000 }}>
          <Pressable
            onPress={() => setToast(null)}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.white, borderRadius: R.md, padding: S.md, borderLeftWidth: 4, borderLeftColor: color }, shadow]}
          >
            <Ionicons name={icon as any} size={20} color={color} />
            <View style={{ flex: 1 }}>
              <Text weight="medium" size={14} color={C.text}>{toast.message}</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}
