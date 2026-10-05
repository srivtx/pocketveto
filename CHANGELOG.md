# Changelog

All notable changes to PocketVeto are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

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
