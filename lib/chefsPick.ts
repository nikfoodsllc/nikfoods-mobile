import { collectDishes, type SearchCell } from '@/lib/menuSearch';
import type { CategoryDisplay } from '@/lib/homeMenu';

/**
 * The Chef's Pick row on Home: the dishes the admin marked (Food Items > Chef's Pick = Yes) that are on the menu right now,
 * each once. A day-wise dish is shown on its earliest open day (so the card says which day); a flat dish has no day.
 * Only what the menu itself lists is shown; an unavailable item, and a day that is closed for ordering, are left out.
 */
export function chefsPickCells(sections: Array<{ name: string; category: CategoryDisplay | null }>, isClosed: (cell: SearchCell) => boolean = () => false): SearchCell[] {
  const seen = new Set<string>();
  const out: SearchCell[] = [];
  for (const group of collectDishes(sections, (item) => item.chefsPick === true && item.available !== false)) {
    for (const cell of group.cells) {
      if (seen.has(cell.item._id) || isClosed(cell)) continue;
      seen.add(cell.item._id);
      out.push(cell);
    }
  }
  return out;
}
