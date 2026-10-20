import { routeForIncomingLink } from '@/lib/deepLink';

// Links the iPhone opens in the app (universal links from emails and texts, and nikfoodsmobile:// links): the website's
// "View my order" path becomes the app's order screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return routeForIncomingLink(path);
}
