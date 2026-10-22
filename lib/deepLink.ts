/**
 * Where a link the iPhone hands to the app should go. Only the "View my order" links in our emails and texts are claimed
 * (/account/orders?order=ORD-...), and they open the app's order screen. Anything else goes to the menu.
 */
export function routeForIncomingLink(input: string): string {
  // the app's own scheme: nikfoodsmobile://orders/ORD-1 is the path /orders/ORD-1
  const path = input.startsWith('nikfoodsmobile://') ? `/${input.slice('nikfoodsmobile://'.length).replace(/^\/+/, '')}` : input;
  let pathname = '';
  let order: string | null = null;
  try {
    const url = new URL(path, 'https://www.nikfoods.com');
    pathname = url.pathname.replace(/\/+$/, '');
    order = url.searchParams.get('order');
  } catch {
    return '/';
  }
  // the app's own links (nikfoodsmobile://orders/ORD-1) and screens already use the app's paths
  if (/^\/orders\/[^/]+$/.test(pathname)) return `/account${pathname}`; // the app's older path for an order
  if (pathname === '/orders') return '/account/orders';
  if (pathname === '' || pathname === '/') return pathname || '/';
  if (pathname === '/account/orders') {
    return order && /^[A-Za-z0-9#-]{4,60}$/.test(order) ? `/account/orders/${encodeURIComponent(order)}` : '/account/orders';
  }
  // only the app's own screens are opened; any other link (a payment link, a page of the website) goes to Home instead of a
  // "not found" screen. Payment links are not claimed by the app, so they open in Safari.
  const ours = /^\/(menu|cart|account)(\/|$)/.test(pathname);
  return ours && path.startsWith('/') && !path.startsWith('//') ? path : '/';
}
