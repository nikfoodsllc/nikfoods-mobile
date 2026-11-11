import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { STORE_URL } from '@/constants/config';

/** The version of this build, from app.json ('1.0.3'). */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0';

/** -1 when a is lower than b, 0 when equal, 1 when higher. A missing part counts as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

const DISMISSED_KEY = 'updateBannerDismissed';

/** Opens this app's page in the App Store (the Dev app: TestFlight). */
export function openStore(): void {
  void Linking.openURL(STORE_URL).catch(() => undefined);
}

/**
 * The newest version the site says is on the App Store, when it is newer than this build and the customer has not closed
 * the bar for that version. Asked once per time the screen is shown; any problem simply means "no bar".
 */
export function useUpdateAvailable(): { latest: string | null; dismiss: () => void } {
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/app-settings')
      .then((r) => r.json())
      .then((j) => {
        const v = typeof j?.data?.latestVersion === 'string' ? j.data.latestVersion.trim() : '';
        if (!live || !/^\d{1,3}(\.\d{1,3}){1,2}$/.test(v)) return;
        if (compareVersions(APP_VERSION, v) >= 0) return;
        if (localStorage.getItem(DISMISSED_KEY) === v) return;
        setLatest(v);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (latest) localStorage.setItem(DISMISSED_KEY, latest);
    setLatest(null);
  }, [latest]);

  return { latest, dismiss };
}
