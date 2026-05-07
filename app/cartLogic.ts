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
    return {
      ...day,
      dayTotal,
      shortfall,
      meetsMinimum,
    };
  });

  const lastDay = dayAnalysis[dayAnalysis.length - 1];
  const totalCartValue = dayAnalysis.reduce((sum, d) => sum + d.dayTotal, 0);
  const daysMeetingMinimum = dayAnalysis.filter(d => d.meetsMinimum);

  if (daysMeetingMinimum.length > 0) {
    // At least one day meets minimum — can checkout
    dayAnalysis.forEach(day => {
      if (!day.meetsMinimum) {
        day.deliveryMessage = {
          type: 'warning',
          message: `Add $${day.shortfall.toFixed(2)} more to meet minimum. Items will be delivered on ${lastDay.dateFormatted}.`,
          deliveryDate: lastDay.dateFormatted,
        };
      }
    });

    return {
      canCheckout: true,
      dayAnalysis,
      totalShortfall: 0,
      checkoutBlockMessage: '',
    };
  }

  if (totalCartValue >= minCartValue) {
    // Combined meets minimum — club all to last day
    dayAnalysis.forEach(day => {
      if (day.date !== lastDay.date) {
        day.deliveryMessage = {
          type: 'warning',
          message: `Items will be delivered on ${lastDay.dateFormatted} (combined with other days).`,
          deliveryDate: lastDay.dateFormatted,
        };
      }
    });

    return {
      canCheckout: true,
      dayAnalysis,
      totalShortfall: 0,
      checkoutBlockMessage: '',
    };
  }

  // Cannot checkout — even combined doesn't meet minimum
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