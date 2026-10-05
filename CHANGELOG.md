# Changelog

All notable changes to PocketVeto are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## [1.3.0] — 2026-10-05

The share-target release: pay for something on your phone, share the
notification, it's on your radar. Plus the new mark, a real nav fix, and
a mobile layout bug hunted to its grid-spec root.

### Added
- **Web Share Target** — installed as an app, PocketVeto now appears in
  Android's share sheet. Share a payment SMS or GPay/PhonePe
  notification and it opens pre-parsed: `parsePaymentText` reads
  ₹/Rs/INR/$ amounts (decimals optional with a currency marker), day-first
  `DD-MM-YY` bank-SMS dates, payees after to/towards/for/at (UPI VPAs
  like `sonyliv@okhdfcbank` included), strips bank tails, and rejects
  promo/OTP texts via a payment-verb gate. One-off payments become
  add-ready cards (prefilled dialog, saves as new); several months of
  the same SMS thread detect cadence like a statement. 10 new tests
  (51 total).
- **Detection ladder research** — `docs/autodetect.md`: the honest map
  of rung 1 (share, shipped) → inbox adapter → Android
  NotificationListenerService companion → bank aggregation
  (Plaid / India's Account Aggregator), plus the TWA-vs-Capacitor plan
  for the Android app and the Play-policy constraints (SMS/Call Log
  groups are restricted; the listener path avoids them).
- **The veto cut** — a new brand mark: a V drawn in one gesture, the
  returning stroke severed before it lands; the detached cliff-red tip
  still completes the letter. One weight, squared terminals, no tile
  clutter. Icons regenerated; favicon added (`src/app/icon.svg`).

### Fixed
- **Landing nav never arrived** — section anchors (`#problem` etc.)
  fought the hash router: every hashchange scrolled the page back to
  the top. Nav links now smooth-scroll without touching the hash
  (reduced-motion aware), and the route only resets scroll on a real
  landing↔app change. A reading-progress hairline under the sticky nav
  ("the reel") makes the position legible at a glance.
- **26px horizontal overflow at 390px** (latent since v1.1): truncated
  `nowrap` item names raised their grid containers' min-content, and
  every nested grid used implicit `auto` tracks — which the spec sizes
  to content, unbounded by the container. All nested grids now declare
  bounded `grid-cols-1` (minmax(0,1fr)) tracks; `document.scrollWidth`
  is exactly the viewport again, verified by script.
- Stat cards stack below 420px so the $-at-risk figures never squish.

### Changed
- **Cinematography pass, not glitter**: scroll reveals now rack focus
  (a slight blur settles into sharpness), the landing↔app swap is a
  scene dissolve with a subtle push-in, the hero radar glow breathes
  (4.5s, ease-in-out), and every button carries a physical press state
  (`active:scale`, disabled under reduced motion). All transform/opacity
  or filter only; all collapsed by `prefers-reduced-motion`.
- **Footer rebuilt** as the mark + quiet link columns (Product / Source /
  Principles) over the honest stat-source bottom line.
- Share + paste flows documented in the README with a fourth screenshot
  (share-flow) and a full file map.

## [1.2.0] — 2026-10-05

Autopay scan, install experience, and a hard fix to the two bugs that
mattered: the hydration failure on every PWA launch, and the edit dialog
rendering transparent.

### Fixed
- **Hydration failure on `/#app`** (the PWA start URL — every installed
  launch hit it): the route state is now deterministic for the first
  paint and syncs from the hash in a pre-paint layout effect. A second,
  attribute-level mismatch (scroll-reveal `style` diverging between
  server and client) is fixed by reading IntersectionObserver
  availability through `useSyncExternalStore`.
- **Edit dialog transparency**: raised the dialog to a solid `ink-900`
  panel with a deeper scrim, and turned form fields into dark inset
  wells so writing reads clearly. (Found while reproducing: the dev
  server had been serving a stale CSS chunk — the entire token palette
  was missing in the previous session's screenshots; a clean restart
  plus the new explicit surface classes make the dialog solid on any
  compile.)
- `next.config.ts` now allows the sandbox preview origin
  (`allowedDevOrigins`) to silence dev cross-origin noise.

### Added
- **Autopay scan** (`src/lib/pocketveto/scan.ts` + Scan tab): paste or
  upload a bank/card activity export (CSV or text); the on-device
  detector parses dated charges, normalizes merchant noise, fits
  weekly/biweekly/monthly/quarterly/annual cadences, scores confidence,
  estimates the next charge date, recognizes ~30 brands (playbook
  attached), and converts findings to tracked items in one tap. 15 new
  unit tests (41 total).
- **Install experience**: `useInstallPrompt` + Install button on the
  landing and app headers — uses the browser's `beforeinstallprompt`
  when available, tells the honest Share → Add to Home Screen path on
  iOS.
- New brand mark ("the intercept"): radar ring, veto slash, charge
  caught at the boundary — in-app (currentColor) and as regenerated
  PWA icons (192/512/maskable) via `scripts/gen-icons.mjs`.
- README rewritten concise: new screenshots (no dev badge), badges,
  autopay-scan section with the honest platform note.

### Changed
- Service worker cache bumped to `pocketveto-v1.2`; version 1.2.0
  in-app and in `package.json`.

## [1.1.0] — 2026-10-05

Design-system pass, unslop, and dependency hygiene. Same tested core;
new surface.

### Added
- **Copy cancel email** — the (already-tested) cancellation email draft
  is now surfaced in the playbook panel for trials, subscriptions and
  memberships, with clipboard copy and honest fallback when the browser
  blocks it.
- Design token system (`ink` / `mist` / `signal` / `cliff` / `warn`) in
  `globals.css` with Tailwind 4 `@theme` integration — components no
  longer hard-code colors.
- Motion primitives (`motion.tsx`): count-up `$` ticker, scroll reveals,
  reduced-motion via `useSyncExternalStore`, sliding tab indicator,
  staggered card entrances, blip pop-in/travel/ping, route cross-fade.
- Brand mark (inline SVG radar), `KindGlyph` icon mapping (Lucide) and
  display typography (Space Grotesk) with mono tabular figures for all
  money values.
- README with badges, screenshots, data-format documentation, design
  notes and roadmap; CONTRIBUTING guide; repo screenshots under
  `docs/`.

### Changed
- Emoji item icons replaced with precise Lucide glyphs everywhere.
- Delete flows use in-app `AlertDialog` confirmation instead of native
  `window.confirm` (item delete and clear-all).
- Landing redesigned: editorial hero with live radar preview, animated
  sourced stats, breakage aside, absence-checklist privacy section.
- App shell redesigned: hairline chrome, urgency-railed item cards,
  keyboard-focusable radar blips with visible focus rings and tooltips
  that open on focus.
- Dark theme fixed at the `<html>` level so all shadcn primitives
  (Select hover, Dialog overlay, Switch) render the product palette
  instead of light-theme defaults.

### Fixed
- **`Load sample data` appended instead of replacing** — each load
  minted fresh ids and stacked duplicates (verified with 16 items in
  storage). Sample load now replaces, and asks first when real items
  exist.
- **CI workflow typo** — the push trigger's branch filter read
  `branches: ain]` (a mangled `[main]`). GitHub happened to fail open and
  run CI anyway, but the filter matched no real branch name; now the
  intended `branches: [main]`, plus a type-check step added to the gate.
- **Scaffold identity in `package.json`** — renamed to `pocketveto`
  v1.1.0 with description; removed 21 unused dependencies (prisma,
  next-auth, next-intl, z-ai-web-dev-sdk, framer-motion, dnd-kit, …)
  and the misleading `prisma/` directory from a product whose README
  says "no database by design."
- Manifest theme colors updated to the product ink; service-worker
  cache bumped (`pocketveto-v1.1`).

## [1.0.0] — 2026-10-05

First public release. Shipped from SVX research track report R16
(consumer money-dates lens, owner-directed pivot 2026-10-05).

### Added
- Nine money-date kinds: free trials, subscriptions, memberships,
  warranties, gift cards, 0% APR (deferred-interest) windows, documents,
  domains, custom — with kind-aware fields, labels and countdowns.
- Live radar visualization: active items as blips closing in on "now",
  7/14/30/60-day rings, rotating sweep, click-to-act.
- `$ at risk` ticker, annualized run-rate, next-7-days strip, saved
  ledger (vetoes/claims/redemptions with recorded amounts).
- Recurrence engine: monthly/annual/custom cycles with auto-advance,
  lapse counting ("renewals fired while you were away") and cycle-scoped
  alert keys.
- Deferred-interest cliff calculator: months left, clearing monthly
  payment, retroactive-interest floor, pace warnings (labeled estimate).
- Playbooks: curated durable cancel paths (Netflix, Spotify, Adobe, NYT,
  Amazon Prime, Costco, gyms, registrars, Apple/Google/Microsoft
  subscriptions) + generic per-kind playbooks + watch-out notes +
  cancellation email draft.
- Alerts: T-7/T-2/day-of browser notifications, threshold-crossing
  banner, permission nudge — with honest limits stated in-app.
- Local-first storage: IndexedDB with localStorage mirror, merge-import,
  plain-JSON export, one-click sample data, danger-zone clear.
- PWA: manifest, offline-capable service worker, generated icons.
- Landing page with sourced stats; privacy architecture page copy.
- 26 unit tests over the pure core (dates, recurrence, risk sums,
  deferred interest, playbooks, import/export) — including an
  `Array.map`-safety regression test.
