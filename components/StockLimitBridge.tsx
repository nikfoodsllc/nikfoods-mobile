import { useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { onStockLimit } from '@/lib/localStorageCart';

/** Says "Only 2 of X left" whenever the cart stops a quantity at what is left of an item with an order limit. Renders nothing. */
export default function StockLimitBridge() {
  const toast = useToast();
  useEffect(
    () =>
      onStockLimit((d) => {
        toast(d.left <= 0 ? `${d.name} is sold out` : `Only ${d.leftText} of ${d.name} left`, 'error');
      }),
    [toast]
  );
  return null;
}
