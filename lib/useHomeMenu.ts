import { useCallback, useEffect, useState } from 'react';
import { DayOption } from '@/lib/dayAvailabilityClient';
import { buildCategoryFoodItemsMap, CategoryDisplay, CategoryListItem, HomeMenuResponse } from '@/lib/homeMenu';

interface Loaded {
  at: number;
  categories: CategoryListItem[];
  map: Map<string, CategoryDisplay>;
  availableDates: DayOption[];
}

// The menu is asked for once and shared by every screen that shows it (Home, Menu, a category, search): they open one after the other.
const FRESH_MS = 45_000;
let cached: Loaded | null = null;
let inflight: Promise<Loaded> | null = null;

async function fetchMenu(): Promise<Loaded> {
  const response = await fetch('/api/home-menu');
  const data: HomeMenuResponse = await response.json();
  if (!response.ok || !data.data) throw new Error('menu');
  return {
    at: Date.now(),
    categories: data.data.categories,
    availableDates: data.data.dates.map((d) => ({ ...d, day: d.formattedDate.split(',')[0], enabled: d.flatCategoryEnabled })) as unknown as DayOption[],
    map: buildCategoryFoodItemsMap(data.data.categories, data.data.categoryItems),
  };
}

function loadMenu(force: boolean): Promise<Loaded> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetchMenu()
      .then((m) => {
        cached = m;
        return m;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Loads the menu the website shows: categories, their items, and the delivery days (one request, same as the site). */
export function useHomeMenu() {
  const [state, setState] = useState<Loaded | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      setError(null);
      setState(await loadMenu(force));
    } catch {
      setError("Couldn't load the menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    categories: state?.categories ?? [],
    map: state?.map ?? new Map<string, CategoryDisplay>(),
    availableDates: state?.availableDates ?? [],
    loading,
    error,
    reload: () => load(true),
  };
}
