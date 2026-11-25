// Two apps from one codebase, like the two websites:
//   APP_VARIANT=dev         -> "NikFoods Dev" (own bundle id, red DEV icon, dev website + Stripe test mode), TestFlight only
//   APP_VARIANT=production  -> "NikFoods" (the App Store app, real website + live Stripe)
// No variant (local `expo start`, simulator builds) keeps app.json exactly as it is.
const fs = require('fs');
const path = require('path');
const base = require('./app.json').expo;

const VARIANTS = {
  dev: {
    name: 'NikFoods Dev',
    scheme: 'nikfoodsmobiledev',
    bundleId: 'com.nikfoods.mobile.dev',
    icon: './assets/images/icon-dev.png',
    domains: ['applinks:livesite-dev.vercel.app'],
    hosts: ['livesite-dev.vercel.app'],
    googleServices: './google-services-dev.json',
    adaptiveIcon: './assets/images/adaptive-icon-dev.png',
  },
  production: {
    name: base.name,
    scheme: base.scheme,
    bundleId: 'com.nikfoods.mobile',
    icon: base.icon,
    domains: ['applinks:www.nikfoods.com'],
    hosts: ['www.nikfoods.com', 'nikfoods.com'],
    googleServices: './google-services.json',
    adaptiveIcon: './assets/images/adaptive-icon.png',
  },
};

module.exports = () => {
  const variant = VARIANTS[process.env.APP_VARIANT];
  if (!variant) return base;
  return {
    ...base,
    name: variant.name,
    scheme: variant.scheme,
    icon: variant.icon,
    ios: { ...base.ios, bundleIdentifier: variant.bundleId, associatedDomains: variant.domains },
    android: {
      ...base.android,
      package: variant.bundleId,
      // Android home-screen icon: the gold "n" (the Dev app adds the red DEV label) on the same dark background as the iPhone icon
      adaptiveIcon: { ...base.android.adaptiveIcon, foregroundImage: variant.adaptiveIcon, backgroundColor: '#1E1B18' },
      // Firebase settings (needed for notifications on Android); left out until the file is added, so builds still work
      ...(fs.existsSync(path.join(__dirname, variant.googleServices)) ? { googleServicesFile: variant.googleServices } : {}),
      // the same website links the iPhone app opens (orders, pay links, cart, checkout); the bank's return page stays on the website
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: variant.hosts.flatMap((host) => [
            { scheme: 'https', host, pathPrefix: '/account' },
            { scheme: 'https', host, pathPrefix: '/pay/' },
            { scheme: 'https', host, pathPrefix: '/orders' },
            { scheme: 'https', host, path: '/cart' },
            { scheme: 'https', host, path: '/checkout' },
          ]),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
