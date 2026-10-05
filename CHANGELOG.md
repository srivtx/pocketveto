# Changelog

All notable changes to PocketVeto are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

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
