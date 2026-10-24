import Constants from 'expo-constants';

/**
 * Where the app talks to. The build profile in eas.json sets these (see "env" there):
 *  - development / preview builds: the dev site (livesite-dev) and Stripe TEST keys, so nothing real is charged
 *  - production build: www.nikfoods.com and the LIVE Stripe key
 * With no profile (plain `expo start`) the safe dev values are used.
 */
const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || 'https://livesite-dev.vercel.app').replace(/\/$/, '');

export const SITE_URL = siteUrl;
export const API_BASE = `${siteUrl}/api`;
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
/** The app's own link scheme: app.config.js gives the dev app its own, so the two apps on one phone never open each other. */
export const APP_SCHEME = (Array.isArray(Constants.expoConfig?.scheme) ? Constants.expoConfig?.scheme[0] : Constants.expoConfig?.scheme) || 'nikfoodsmobile';
export const APPLE_MERCHANT_ID = 'merchant.com.nikfoods';
/** True in a build that talks to the live site. Shown nowhere to customers; used to label test builds. */
export const IS_LIVE = siteUrl === 'https://www.nikfoods.com';
