import { getStoreCountry } from '../modules/store-country';
import { feeRegionForStore, setDefaultFeeRegion } from './cartLogic';

let storeCountry: string | null = null;

/**
 * Reads the App Store country once at start and sets the Platform Fee rate for this app run: customers of an App Store outside
 * the US pay 6% + $0.30 (their cards cost more at Stripe), everyone else 4% + $0.31. The server works the same thing out from the
 * country the app sends with the payment, so what the cart shows is what is charged. When the country cannot be read the
 * ordinary fee is used. While developing, EXPO_PUBLIC_STORE_COUNTRY (for example IND) stands in for the store; release builds ignore it.
 */
export async function initStoreRegion(): Promise<string | null> {
  const override = __DEV__ ? process.env.EXPO_PUBLIC_STORE_COUNTRY?.trim().toUpperCase() : undefined;
  storeCountry = override || (await getStoreCountry());
  setDefaultFeeRegion(feeRegionForStore(storeCountry));
  return storeCountry;
}

/** The App Store country to send with a payment or an order (undefined when unknown). */
export const currentStoreCountry = (): string | undefined => storeCountry ?? undefined;
