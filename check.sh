#!/usr/bin/env bash
# The checks that prove this portfolio works. The Stop hook runs this file.
# Never make a check pass by skipping, weakening or special-casing it.
set -euo pipefail
cd "$(dirname "$0")"

npm run build
node --test test/                      # code matches GitHub at the pinned commit, numbers come from facts, answers confirmed
npx playwright test                    # demo path at phone and laptop width, axe, 404, badge corner, reduced motion; records video
node serve.mjs >/dev/null 2>&1 & srv=$!
trap 'kill $srv 2>/dev/null' EXIT
sleep 1
node scripts/lighthouse.mjs            # mobile: performance >= 95, accessibility 100, best practices and SEO >= 95 (median of 3)
node scripts/links.mjs                 # every outside link answers below 400
echo "check.sh: all checks passed"
