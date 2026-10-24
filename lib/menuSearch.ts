import type { CategoryDisplay } from '@/lib/homeMenu';
import type { FoodItem } from '@/types/food';

type DayGroup = CategoryDisplay['dayGroups'][number];
export interface SearchCell {
  item: FoodItem;
  dayGroup?: DayGroup;
}
export interface SearchGroup {
  /** "Wednesday, Oct 21" for a delivery day, or the category's name for items that are not tied to a day */
  title: string;
  /** the delivery day (YYYY-MM-DD) or '' for the category groups */
  date: string;
  cells: SearchCell[];
}

const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Every word of the search must be somewhere in the dish's name. */
export function matchesQuery(name: string, query: string): boolean {
  const words = clean(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const hay = clean(name);
  return words.every((w) => hay.includes(w));
}

/**
 * Every dish `keep` accepts, across the whole menu: first by delivery day (earliest first), then the ones that are not tied to a
 * day, by category. A dish that is on two days shows under both. The cells are the same shape the menu's own rows use, so the dish
 * cards and Add buttons behave exactly the same.
 */
export function collectDishes(categories: Array<{ name: string; category: CategoryDisplay | null }>, keep: (item: FoodItem) => boolean): SearchGroup[] {
  const byDate = new Map<string, SearchGroup>();
  const flat: SearchGroup[] = [];
  const seen = new Set<string>();

  const add = (group: SearchGroup, item: FoodItem, dayGroup?: DayGroup) => {
    const key = `${item._id}|${group.date || 'flat'}`;
    if (seen.has(key)) return;
    seen.add(key);
    group.cells.push({ item, dayGroup });
  };

  const walk = (c: CategoryDisplay, label: string) => {
    for (const g of c.dayGroups ?? []) {
      const hits = g.foodItems.filter(keep);
      if (hits.length === 0) continue;
      let group = byDate.get(g.date);
      if (!group) {
        group = { title: g.displayName || g.formattedDate || g.date, date: g.date, cells: [] };
        byDate.set(g.date, group);
      }
      for (const it of hits) add(group, it, g);
    }
    if ((c.listingType ?? 'flat') === 'flat') {
      const hits = (c.foodItems ?? []).filter(keep);
      if (hits.length > 0) {
        let group = flat.find((x) => x.title === label);
        if (!group) {
          group = { title: label, date: '', cells: [] };
          flat.push(group);
        }
        for (const it of hits) add(group, it);
      }
    }
    for (const sub of c.subCategories ?? []) walk(sub, sub.name || label);
  };

  for (const { name, category } of categories) if (category) walk(category, name);
  return [...[...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), ...flat];
}

/** The dishes whose name matches the search (see collectDishes). */
export function searchMenu(categories: Array<{ name: string; category: CategoryDisplay | null }>, query: string): SearchGroup[] {
  if (!clean(query).trim()) return [];
  return collectDishes(categories, (it) => matchesQuery(it.name, query));
}
