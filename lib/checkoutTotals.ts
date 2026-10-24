import { Cart } from '@/types/cart';

/** The same sum as the website's checkout: subtotal + Platform Fee + delivery + tax + tip - discount. The fee and tax follow the card part when store credit is used. */
export function cartTotalsWithTip(cart: Cart, tipPercentage: number, credited: { platformFee: number; tax: number; total: number } | null) {
  const subtotal = cart.subtotal;
  const platformFee = credited ? credited.platformFee : cart.platformFee;
  const deliveryFee = cart.deliveryFee;
  const tax = credited ? credited.tax : cart.tax;
  const tip = (subtotal * tipPercentage) / 100;
  const discount = cart.appliedCoupon?.discountAmount || 0;
  const total = subtotal + platformFee + deliveryFee + tax + tip - discount;
  return { subtotal, platformFee, deliveryFee, tax, tip, discount, total };
}
