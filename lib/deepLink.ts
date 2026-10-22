/**
 * Where a link the iPhone hands to the app should go. Only the "View my order" links in our emails and texts are claimed
 * (/account/orders?order=ORD-...), and they open the app's order screen. Anything else goes to the menu.
 */
const SITE_HOSTS = new Set(['www.nikfoods.com', 'nikfoods.com', 'livesite-dev.vercel.app']);

export function routeForIncomingLink(input: string): string {
  // the link must be a path of this site (or a full address on one of its hosts); anything else goes Home
  if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !input.startsWith('nikfoodsmobile://')) {
    try {
      if (!SITE_HOSTS.has(new URL(input).host)) return '/';
    } catch {
      return '/';
    }
  }
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
  // the pay link an admin emails: the app's own pay screen (the secret stays in the link)
  const pay = pathname.match(/^\/pay\/([A-Za-z0-9#-]{4,60})$/);
  if (pay) {
    const t = (() => { try { return new URL(path, 'https://www.nikfoods.com').searchParams.get('t') ?? ''; } catch { return ''; } })();
    return `/pay/${encodeURIComponent(pay[1])}${t ? `?t=${encodeURIComponent(t)}` : ''}`;
  }
  if (path.startsWith('//') || /[\s\\]/.test(pathname)) return '/';
  // the website's checkout is the app's checkout (it shows the cart instead when nothing is in it)
  if (pathname === '/checkout') return '/cart/checkout';
  if (pathname === '/cart/checkout-success') return `${pathname}${new URL(path, 'https://www.nikfoods.com').search}`;
  // the app's own screens (the same paths as the website's cart and account pages); the cart keeps its ?restore= link details
  const search = new URL(path, 'https://www.nikfoods.com').search;
  if (pathname === '/cart') return `/cart${search}`;
  if (['/menu', '/account', '/account/addresses', '/account/notifications', '/cart/checkout'].includes(pathname) || /^\/menu\/[A-Za-z0-9]+$/.test(pathname)) return pathname;
  // every other page of the website (Terms, Privacy, FAQs, ...) opens inside the app, fully working
  return `/web?path=${encodeURIComponent(pathname + new URL(path, 'https://www.nikfoods.com').search)}`;
}
