// Two apps from one codebase, like the two websites:
//   APP_VARIANT=dev         -> "NikFoods Dev" (own bundle id, red DEV icon, dev website + Stripe test mode), TestFlight only
//   APP_VARIANT=production  -> "NikFoods" (the App Store app, real website + live Stripe)
// No variant (local `expo start`, simulator builds) keeps app.json exactly as it is.
const base = require('./app.json').expo;

const VARIANTS = {
  dev: {
    name: 'NikFoods Dev',
    scheme: 'nikfoodsmobiledev',
    bundleId: 'com.nikfoods.mobile.dev',
    icon: './assets/images/icon-dev.png',
    domains: ['applinks:livesite-dev.vercel.app'],
  },
  production: {
    name: base.name,
    scheme: base.scheme,
    bundleId: 'com.nikfoods.mobile',
    icon: base.icon,
    domains: ['applinks:www.nikfoods.com'],
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
    android: { ...base.android, package: variant.bundleId },
  };
};
