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
  if (/^\/orders\/[^/]+$/.test(pathname) || pathname === '' || pathname === '/') return pathname || '/';
  if (pathname === '/account/orders') {
    return order && /^[A-Za-z0-9#-]{4,60}$/.test(order) ? `/orders/${encodeURIComponent(order)}` : '/orders';
  }
  return path.startsWith('/') && !path.startsWith('//') && !/^\/[a-z]+:/i.test(path) ? path : '/';
}
