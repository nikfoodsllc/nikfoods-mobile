import { Cart } from '@/types/cart';

/** The same sum as the website's checkout: subtotal + Platform Fee + delivery + tax + tip - discount. The fee and tax follow the card part when store credit is used. */
/** The most a typed tip can be (dollars); the server refuses more. */
export const MAX_TIP_AMOUNT = 500;

/** A typed tip in dollars from the text box: null when empty or not a usable amount (0 to MAX_TIP_AMOUNT). */
export function parseTipText(text: string): number | null {
  if (text === '' || text === '.') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= MAX_TIP_AMOUNT ? Math.round(n * 100) / 100 : null;
}

/** Keeps digits and one dot, at most two decimals. */
export function cleanTipText(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, '');
  const [whole, ...rest] = kept.split('.');
  return (rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : whole).slice(0, 7);
}

/** `customTip` (dollars) replaces the percentage when set. */
export function cartTotalsWithTip(cart: Cart, tipPercentage: number, credited: { platformFee: number; tax: number; total: number } | null, customTip: number | null = null) {
  const subtotal = cart.subtotal;
  const platformFee = credited ? credited.platformFee : cart.platformFee;
  const deliveryFee = cart.deliveryFee;
  const tax = credited ? credited.tax : cart.tax;
  const tip = customTip !== null ? customTip : (subtotal * tipPercentage) / 100;
  const discount = cart.appliedCoupon?.discountAmount || 0;
  const total = subtotal + platformFee + deliveryFee + tax + tip - discount;
  return { subtotal, platformFee, deliveryFee, tax, tip, discount, total };
}
