export const DEFAULT_MIN_CART_VALUE = 25.0;
export const TAX_RATE = 0.103;
export const SERVICE_FEE_RATE = 0.04;

export interface DayAnalysis {
  date: string;
  dateFormatted: string;
  items: any[];
  dayTotal: number;
  shortfall: number;
  meetsMinimum: boolean;
  deliveryMessage?: {
    type: 'warning' | 'error';
    message: string;
    deliveryDate?: string;
  };
}

export interface CartClubbingResult {
  canCheckout: boolean;
  dayAnalysis: DayAnalysis[];
  totalShortfall: number;
  checkoutBlockMessage: string;
}

export function calculateCartClubbing(
  cartItems: any[],
  minCartValue: number = DEFAULT_MIN_CART_VALUE
): CartClubbingResult {
  if (!cartItems.length) {
    return {
      canCheckout: false,
      dayAnalysis: [],
      totalShortfall: 0,
      checkoutBlockMessage: 'Your cart is empty',
    };
  }

  // Group items by delivery date
  const dayMap: Record<string, { date: string; dateFormatted: string; items: any[] }> = {};
  cartItems.forEach(item => {
    const key = item.deliveryDate;
    if (!dayMap[key]) {
      dayMap[key] = {
        date: item.deliveryDate,
        dateFormatted: item.deliveryDateFormatted,
        items: [],
      };
    }
    dayMap[key].items.push(item);
  });

  // Sort by date chronologically
  const sortedDays = Object.values(dayMap).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate totals per day
  const dayAnalysis: DayAnalysis[] = sortedDays.map(day => {
    const dayTotal = day.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shortfall = Math.max(0, minCartValue - dayTotal);
    const meetsMinimum = dayTotal >= minCartValue;
    return { ...day, dayTotal, shortfall, meetsMinimum };
  });

  const totalCartValue = dayAnalysis.reduce((sum, d) => sum + d.dayTotal, 0);

  // Cannot checkout — even combined doesn't meet minimum
  if (totalCartValue < minCartValue) {
    const totalShortfall = minCartValue - totalCartValue;
    dayAnalysis.forEach(day => {
      day.deliveryMessage = {
        type: 'error',
        message: `Min order value not met. Add $${day.shortfall.toFixed(2)} worth of items.`,
      };
    });
    return {
      canCheckout: false,
      dayAnalysis,
      totalShortfall,
      checkoutBlockMessage: `Add $${totalShortfall.toFixed(2)} more to meet the minimum order value of $${minCartValue.toFixed(2)}.`,
    };
  }

  // Grouping algorithm:
  // 1. Start a group from day i, accumulate forward until group total >= min
  // 2. Before finalising the group, check if the REMAINING days after this group
  //    can form their own valid group (i.e. their combined total >= min).
  //    If not, absorb them into the current group.
  // 3. Repeat from step 1 for the next unprocessed day.

  const n = dayAnalysis.length;
  let i = 0;

  while (i < n) {
    let groupTotal = dayAnalysis[i].dayTotal;
    let groupEnd = i;

    // Accumulate days until group total meets minimum
    while (groupTotal < minCartValue && groupEnd + 1 < n) {
      groupEnd++;
      groupTotal += dayAnalysis[groupEnd].dayTotal;
    }

    // Now check: can the remaining days after groupEnd form their own valid group?
    // If not, absorb them into this group
    if (groupEnd + 1 < n) {
      const remainingTotal = dayAnalysis
        .slice(groupEnd + 1)
        .reduce((sum, d) => sum + d.dayTotal, 0);

      if (remainingTotal < minCartValue) {
        // Remaining days can't form a valid group on their own
        // Absorb them into this group
        groupEnd = n - 1;
      }
    }

    const deliveryDay = dayAnalysis[groupEnd];

    if (groupEnd === i) {
      // Single day group — standalone delivery
      dayAnalysis[i].meetsMinimum = true;
      dayAnalysis[i].deliveryMessage = undefined;
    } else {
      // Multi-day group — all days except last clubbed to delivery day
      for (let k = i; k < groupEnd; k++) {
        dayAnalysis[k].meetsMinimum = false;
        dayAnalysis[k].deliveryMessage = {
          type: 'warning',
          message: `Delivery moved to ${deliveryDay.dateFormatted} (combined with items from that day).`,
          deliveryDate: deliveryDay.dateFormatted,
        };
      }
      // Last day in group = delivery day, mark green
      dayAnalysis[groupEnd].meetsMinimum = true;
      dayAnalysis[groupEnd].deliveryMessage = undefined;
    }

    i = groupEnd + 1;
  }

  return {
    canCheckout: true,
    dayAnalysis,
    totalShortfall: 0,
    checkoutBlockMessage: '',
  };
}

export function getPlatformFee(subtotal: number): number {
  return Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
}

export function calculateTax(subtotal: number, platformFee: number = 0): number {
  return Number(((subtotal + platformFee) * TAX_RATE).toFixed(2));
}

export function calculateTotalPrice(subtotal: number, deliveryFee: number = 0, discount: number = 0) {
  const platformFee = getPlatformFee(subtotal);
  const tax = calculateTax(subtotal, platformFee);
  const total = subtotal + tax + platformFee + deliveryFee - discount;
  return {
    subtotal,
    platformFee,
    tax,
    deliveryFee,
    discount,
    total: Number(total.toFixed(2)),
  };
}

export default calculateCartClubbing;