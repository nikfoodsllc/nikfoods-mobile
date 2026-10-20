import { useCallback, useEffect, useState } from 'react';
import { DayOption } from '@/lib/dayAvailabilityClient';
import { buildCategoryFoodItemsMap, CategoryDisplay, CategoryListItem, HomeMenuResponse } from '@/lib/homeMenu';

/** Loads the menu the website shows: categories, their items, and the delivery days (one request, same as the site). */
export function useHomeMenu() {
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [map, setMap] = useState<Map<string, CategoryDisplay>>(new Map());
  const [availableDates, setAvailableDates] = useState<DayOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/home-menu');
      const data: HomeMenuResponse = await response.json();
      if (!response.ok || !data.data) throw new Error('menu');
      setCategories(data.data.categories);
      setAvailableDates(
        data.data.dates.map((d) => ({ ...d, day: d.formattedDate.split(',')[0], enabled: d.flatCategoryEnabled })) as unknown as DayOption[]
      );
      setMap(buildCategoryFoodItemsMap(data.data.categories, data.data.categoryItems));
    } catch {
      setError("Couldn't load the menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { categories, map, availableDates, loading, error, reload: load };
}
