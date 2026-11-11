import { useSyncExternalStore } from 'react';
import { cleanAllergens } from '@/lib/allergens';

/**
 * Two menu choices next to "Veg only", shared by every menu screen:
 *  - Skip allergens: dishes that contain a ticked allergen are hidden. Remembered on the phone (it is a safety choice).
 *  - Eco containers: dishes that offer an eco container start with it ticked. NOT remembered (it adds a charge to each dish).
 */
const SKIP_KEY = 'skipAllergens';
const skipListeners = new Set<() => void>();
let skip: readonly string[] | null = null;

const readSkip = (): readonly string[] => {
  if (skip === null) {
    try {
      skip = cleanAllergens(JSON.parse(localStorage.getItem(SKIP_KEY) || '[]'));
    } catch {
      skip = [];
    }
  }
  return skip;
};

export function setSkipAllergens(list: readonly string[]): void {
  skip = cleanAllergens([...list]);
  localStorage.setItem(SKIP_KEY, JSON.stringify(skip));
  skipListeners.forEach((l) => l());
}

export function useSkipAllergens(): [readonly string[], (list: readonly string[]) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      skipListeners.add(cb);
      return () => skipListeners.delete(cb);
    },
    readSkip,
    readSkip
  );
  return [v, setSkipAllergens];
}

const ecoListeners = new Set<() => void>();
let eco = false;

export function setEcoPreselect(v: boolean): void {
  eco = v;
  ecoListeners.forEach((l) => l());
}
/** Read without subscribing (for add-to-cart code that is not a component). */
export const getEcoPreselect = (): boolean => eco;

export function useEcoPreselect(): [boolean, (v: boolean) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      ecoListeners.add(cb);
      return () => ecoListeners.delete(cb);
    },
    () => eco,
    () => eco
  );
  return [v, setEcoPreselect];
}

/** What a quick add puts on the cart line when Eco containers is on: only for dishes that offer an eco container. */
export function ecoPreselected(item: { isEcoFriendlyContainer?: boolean; ecoContainerCharge?: number }, on: boolean) {
  if (!on || !item.isEcoFriendlyContainer) return {};
  return { isEcoFriendlyContainer: true, ecoContainerCharge: item.ecoContainerCharge };
}
