import { requireOptionalNativeModule } from 'expo-modules-core';

type StoreCountryNative = { getStoreCountry(): Promise<string | null> };

// Missing in Expo Go and on the web: the app then treats the store as unknown (the ordinary fee).
const native = requireOptionalNativeModule<StoreCountryNative>('StoreCountry');

/** iPhone: the country of the App Store the app was installed from (3-letter code such as "USA"); Android: the SIM's country ("US"). Null when unknown. */
export async function getStoreCountry(): Promise<string | null> {
  try {
    const code = native ? await native.getStoreCountry() : null;
    return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}
