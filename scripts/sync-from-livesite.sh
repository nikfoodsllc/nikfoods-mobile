#!/bin/bash
# Copies the website's pure rule files (cart, pricing, cutoffs, dates, store credit) into this app, byte for byte,
# so the app follows exactly the same rules. Run from nikfoods-mobile/ after changing any of them in livesite.
# The website folder is expected next to this one (../livesite).
set -euo pipefail
SRC="../livesite/src"
FILES=(
  types/cart.ts types/localCart.ts types/food.ts types/zipcode.ts types/order.ts
  lib/cartLogic.ts lib/timezone.ts lib/storeCredit.ts lib/orderTotalsDisplay.ts lib/localStorageCart.ts
  lib/dayAvailabilityClient.ts lib/closedDaysNotice.ts lib/orderHelpers.ts lib/deliveryCalculator.ts lib/normalizeCartAddress.ts lib/clientUtils.ts lib/zipcodeCache.ts types/auth.ts
)
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  cp "$SRC/$f" "$f"
done
echo "synced ${#FILES[@]} files from $SRC"
# (contexts/ and hooks/ are copied once and then adapted for the phone: they are NOT overwritten by this script)
