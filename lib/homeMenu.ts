/**
 * The website's menu shaping rules (copied from livesite src/app/page.tsx; keep in step).
 * Pure functions: categories with sub-categories, day groups, veg filter, which items are allowed on a date.
 */
import { FoodItem } from '@/types/food';
import { DayOption } from '@/lib/dayAvailabilityClient';
import { getPSTWeekday, createPSTDate } from '@/lib/timezone';

// Define types for the new API response structure
export interface CategoryDisplay {
  _id: string;
  name: string;
  description: string;
  url: string;
  listingType: 'flat' | 'day-wise';
  foodItems: FoodItem[];
  dayWiseItems: { [dateString: string]: FoodItem[] } | null; // Date strings as keys (YYYY-MM-DD)
  dayGroups: Array<{
    date: string; // Date string in YYYY-MM-DD format
    formattedDate: string; // Formatted date for display (e.g., "Monday, Jan 15")
    displayName: string; // Display name (alias for formattedDate)
    day?: string; // Optional day name for backward compatibility
    foodItems: FoodItem[];
  }>;
  /** One level of sub-categories shown under this parent on the home page */
  subCategories?: CategoryDisplay[];
  /** FLAT-mapped food item ids for sub-categories (used to group under day-wise parents) */
  flatTaggedItemIds?: string[];
}

export function normalizeItemId(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null && 'toString' in id) {
    return String(id);
  }
  return String(id);
}

export function getSubFlatTaggedIds(sub: CategoryDisplay): Set<string> {
  if (sub.flatTaggedItemIds?.length) {
    return new Set(sub.flatTaggedItemIds.map(normalizeItemId));
  }
  return new Set((sub.foodItems ?? []).map((i) => normalizeItemId(i._id)));
}

export function itemTaggedToSub(item: FoodItem, subId: string): boolean {
  const normSub = normalizeItemId(subId);
  if (item.subCategoryIds?.length) {
    return item.subCategoryIds.some((id) => normalizeItemId(id) === normSub);
  }
  const taggedSubId = item.subCategoryId ? normalizeItemId(item.subCategoryId) : '';
  return taggedSubId === normSub;
}

export function itemTaggedToAnySub(item: FoodItem, subs: CategoryDisplay[]): boolean {
  return subs.some((sub) => itemTaggedToSub(item, sub._id));
}

export function resolveSubCategoriesForDisplay(
  category: CategoryDisplay,
  categoriesList: CategoryListItem[],
  itemsMap: Map<string, CategoryDisplay>
): CategoryDisplay[] {
  if (category.subCategories?.length) {
    return category.subCategories;
  }
  const meta = categoriesList.find((c) => c._id === category._id);
  if (!meta?.children?.length) return [];
  return meta.children
    .slice()
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .map((ch) => itemsMap.get(ch._id))
    .filter((x): x is CategoryDisplay => !!x);
}


// API response types
export interface CategoriesResponse {
  data: {
    items: Array<{
      _id: string;
      name: string;
      description: string;
      imageUrl: string;
      listingType: 'flat' | 'day-wise';
      sequence: number;
      children?: Array<{
        _id: string;
        name: string;
        description: string;
        imageUrl: string;
        listingType: 'flat' | 'day-wise';
        sequence: number;
      }>;
    }>;
  };
  message: string;
}

export type CategoryListItem = CategoriesResponse['data']['items'][number];

export interface HomeMenuResponse {
  data: {
    categories: CategoryListItem[];
    categoryItems: Record<
      string,
      {
        _id: string;
        name: string;
        description: string;
        url: string;
        listingType: 'flat' | 'day-wise';
        foodItems?: FoodItem[];
        dayWiseItems?: { [dateString: string]: FoodItem[] } | null;
      }
    >;
    dates: Array<{
      id: string;
      date: string;
      flatCategoryEnabled: boolean;
      dayWiseCategoryEnabled: boolean;
      formattedDate: string;
      fullDate: string;
      isToday: boolean;
      isPast: boolean;
      isPastCutoff: boolean;
    }>;
  };
  message: string;
}

export function buildCategoryFoodItemsMap(
  categoriesList: CategoryListItem[],
  categoryItems: HomeMenuResponse['data']['categoryItems']
): Map<string, CategoryDisplay> {
  const newMap = new Map<string, CategoryDisplay>();

  for (const [id, item] of Object.entries(categoryItems)) {
    const categoryDisplay: CategoryDisplay = {
      _id: item._id,
      name: item.name,
      description: item.description,
      url: item.url,
      listingType: item.listingType,
      foodItems: item.foodItems || [],
      dayWiseItems: item.dayWiseItems ?? null,
      dayGroups: [],
    };
    if (categoryDisplay.foodItems.length > 0) {
      categoryDisplay.flatTaggedItemIds = categoryDisplay.foodItems.map((i) =>
        normalizeItemId(i._id)
      );
    }
    newMap.set(id, categoryDisplay);
  }

  for (const parent of categoriesList) {
    const parentEntry = newMap.get(parent._id);
    if (!parentEntry || !parent.children?.length) continue;
    const subCategories = parent.children
      .slice()
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      .map((ch) => newMap.get(ch._id))
      .filter((x): x is CategoryDisplay => !!x);
    if (subCategories.length > 0) {
      parentEntry.subCategories = subCategories;
      newMap.set(parent._id, parentEntry);
    }
  }

  return newMap;
}

export function categoryHasDisplayItems(c: CategoryDisplay): boolean {
  if (c.listingType === 'flat') {
    return (c.foodItems?.length ?? 0) > 0;
  }
  return (c.dayGroups?.length ?? 0) > 0;
}

export function categoryOrSubsHaveItems(c: CategoryDisplay): boolean {
  if (categoryHasDisplayItems(c)) return true;
  return (c.subCategories ?? []).some(categoryOrSubsHaveItems);
}

export function flattenCategoriesWithSubs(categories: CategoryDisplay[]): CategoryDisplay[] {
  const out: CategoryDisplay[] = [];
  for (const c of categories) {
    out.push(c);
    for (const s of c.subCategories ?? []) {
      out.push(s);
    }
  }
  return out;
}

export function applyCategoryDisplayFilters(
  category: CategoryDisplay,
  vegOnly: boolean,
  availableDates: DayOption[]
): CategoryDisplay {
  const subCategories = category.subCategories?.map((sub) =>
    applyCategoryDisplayFilters(sub, vegOnly, availableDates)
  );

  const listingType = category.listingType || 'flat';

  if (listingType === 'flat') {
    const filteredFoodItems = vegOnly
      ? (category.foodItems || []).filter((item) => item.veg !== false)
      : (category.foodItems || []);

    return {
      ...category,
      listingType,
      foodItems: filteredFoodItems,
      dayGroups: [],
      ...(subCategories && subCategories.length > 0 ? { subCategories } : {}),
    };
  }

  const dayWiseItems = category.dayWiseItems || {};
  const dayGroups = Object.entries(dayWiseItems)
    .filter(([, items]) => items && items.length > 0)
    .map(([dateString, items]) => {
      const filteredItems = vegOnly
        ? items.filter((item) => item.veg !== false)
        : items.slice();
      const forDay = filterFoodItemsForDate(filteredItems, dateString, availableDates);

      const dateOption = availableDates.find((d) => d.date === dateString);
      const [year, month, day] = dateString.split('-').map(Number);
      const dateObj = createPSTDate(year, month - 1, day);
      const dayName = getPSTWeekday(dateObj);

      return {
        date: dateString,
        formattedDate: dateOption?.formattedDate || dateString,
        displayName: dateOption?.formattedDate || dateString,
        day: dayName,
        foodItems: forDay,
      };
    })
    .filter((dayGroup) => dayGroup.foodItems.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...category,
    listingType,
    foodItems: category.foodItems ?? [],
    dayGroups,
    ...(subCategories && subCategories.length > 0 ? { subCategories } : {}),
  };
}

/** Weekday label (e.g. Monday) for a calendar date in PST, preferring API day options when present. */
export function resolveWeekdayLabelForDate(dateString: string, availableDates: DayOption[]): string {
  const opt = availableDates.find((d) => d.date === dateString);
  if (opt?.day) {
    return opt.day;
  }
  const [y, m, day] = dateString.split('-').map(Number);
  const dateObj = createPSTDate(y, m - 1, day);
  return getPSTWeekday(dateObj);
}

export function foodItemAllowedOnDate(
  item: FoodItem,
  dateString: string,
  availableDates: DayOption[]
): boolean {
  if (item.available === false) {
    return false;
  }
  const allowed = item.availableWeekDays;
  if (!allowed || allowed.length === 0) {
    return true;
  }
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  const weekday = resolveWeekdayLabelForDate(dateString, availableDates).trim().toLowerCase();

  return allowed.some((d) => {
    const raw = d.trim();
    if (!raw) {
      return false;
    }
    if (dateRegex.test(raw)) {
      return raw === dateString;
    }
    return raw.toLowerCase() === weekday;
  });
}

export function filterFoodItemsForDate(
  items: FoodItem[],
  dateString: string,
  availableDates: DayOption[]
): FoodItem[] {
  return items.filter((item) => foodItemAllowedOnDate(item, dateString, availableDates));
}

export function getItemsForSubOnDate(
  sub: CategoryDisplay,
  date: string,
  availableDates: DayOption[],
  parentDayItems?: FoodItem[]
): FoodItem[] {
  const flatTaggedIds = getSubFlatTaggedIds(sub);
  const byId = new Map<string, FoodItem>();

  const dayGroupItems = sub.dayGroups?.find((x) => x.date === date)?.foodItems ?? [];
  for (const item of filterFoodItemsForDate(dayGroupItems, date, availableDates)) {
    byId.set(normalizeItemId(item._id), item);
  }

  for (const item of parentDayItems ?? []) {
    const id = normalizeItemId(item._id);
    if (itemTaggedToSub(item, sub._id) || flatTaggedIds.has(id)) {
      byId.set(id, item);
    }
  }

  for (const item of filterFoodItemsForDate(sub.foodItems ?? [], date, availableDates)) {
    const id = normalizeItemId(item._id);
    if (!byId.has(id)) {
      byId.set(id, item);
    }
  }

  return Array.from(byId.values());
}

/** Dates to show for a day-wise parent that has sub-categories (union of parent + day-wise subs). */
export function collectSortedDatesForDayWiseParentWithSubs(category: CategoryDisplay): string[] {
  const set = new Set<string>();
  for (const dg of category.dayGroups ?? []) {
    if (dg.foodItems.length > 0) {
      set.add(dg.date);
    }
  }
  for (const sub of category.subCategories ?? []) {
    if (sub.listingType === 'day-wise') {
      for (const dg of sub.dayGroups ?? []) {
        if (dg.foodItems.length > 0) {
          set.add(dg.date);
        }
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

