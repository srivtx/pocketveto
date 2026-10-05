# Changelog

All notable changes to PocketVeto are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/).

## [1.4.1] — 2026-10-05

### Fixed
- **The APK installs without a fight.** v1.4.0's optional bank-SMS
  receiver declared the SMS permission group, which made Play Protect
  hard-block the install ("can access sensitive data … identity and
  financial fraud") with no proceed-anyway path. The receiver is gone —
  notification access alone now carries auto-detection, and the app
  installs through the ordinary "allow unknown apps" flow.
- The APK opens like an app, not a website: the shell loads the app
  view directly, and a skippable one-time tutorial (three steps, Skip
  always visible) covers the notification-access switch on first run.

### Added
- **Device-aware install.** On Android browsers the install button and a
  dismissible strip link straight to the latest release APK — CI
  re-attaches a stable filename (`PocketVeto-android.apk`) every
  release, so the link never rots. Desktop keeps the browser install
  flow; inside the APK, install UI disappears entirely.
- **Known-subscription detection.** Recognized brands (Netflix,
  Spotify, Hotstar, SonyLIV, …) are flagged as known subscriptions by a
  bundled local catalog — no server, no email lookup — which survives a
  plan-price change between two captures and floors confidence at 0.85.
- Privacy section redesigned: the "never ask for" list is now a quiet
  tile grid with the storage/export spec as a mono footer.

### Changed
- README reworked: the writing leads, one screenshot follows it — no
  more full-page capture at the top.

## [1.4.0] — 2026-10-05

### Added
- **Android app** (`android/`): a native shell around the same web app,
  with the capture engine that makes autopay detection automatic —
  `NotificationListenerService` reads payment notifications (PhonePe,
  GPay, Paytm, banks) after one switch in system settings, and an
  opt-in `RECEIVE_SMS` receiver adds bank SMS. Raw text is captured
  natively, parsed on-device by the same tested detector, never
  uploaded. CI builds the signed APK on every `v*` tag and attaches it
  to the GitHub Release (`.github/workflows/android.yml`) — sideload
  distribution, no Play Store.
- **Phone capture section** (Scan tab, inside the APK): permission
  switches with live status, a pending-captures counter, and
  review-cards flow through the same detector as share/paste. Captures
  waiting at app open route you to Scan automatically.
- `build:static` — the web export (NEXT_STATIC=1) that ships inside the
  APK.

### Fixed
- Small-screen layout (≤360px): the landing hero/features/steps/privacy
  grids used unbounded implicit tracks, cutting the radar card and CTA
  buttons off the right edge — all bounded now (`grid-cols-1`).
- The app tab bar at ≤420px: labels yield to icons (aria-labels kept)
  and the sliding indicator is positioned inside the scrollable nav, so
  the document no longer scrolls 141px sideways on the last tabs.

### Changed
- Footer rebuilt customs-style: a crafted sweep band (the radar's signal
  edge in the footer), brand column with source pill, quiet link
  columns, one honest line at the bottom — the stat-source citation wall
  is gone (sources stay inline where the stats appear).
- README shortened to a one-pager: what it is, the screenshots, run it,
  install the APK, links out.

## [1.3.0] — 2026-10-05

### Added
- Web Share Target: share any payment SMS/notification into PocketVeto
  (Android installed-PWA) — parsed on-device into track cards; cadence
  detection across a shared SMS thread.
- Payment-notification parser: ₹/Rs/INR/$ amounts, day-first bank dates,
  UPI payee grammar, promo/OTP rejection.
- "The veto cut" logo, redesigned nav (smooth-scroll, no hash fights),
  cinematography pass on motion (focus-pull reveals, scene dissolve,
  breathing hero glow), docs/autodetect.md ladder.

## [1.2.0] — 2026-10-04

### Added
- Autopay scan: paste a bank/card statement (CSV or lines) — the
  on-device detector finds recurring charges (cadence, next charge,
  confidence), one tap tracks them with the right playbook attached.
- Install experience: honest install button (Android/desktop) and the
  iOS Add-to-Home-Screen path.

### Fixed
- Hydration failures (route seeding from `window.location.hash`, and an
  attribute-level mismatch in Reveal) — the render tree is now
  deterministic; both surfaces verified console-clean.
- Edit dialog was rendering fully transparent (stale dev-server CSS
  chunk, not a CSS bug) — dialog surfaces made solid and the incident
  documented.
- Icons regenerated from the new brand mark; screenshots retaken clean.

## [1.1.0] — 2026-10-04

### Added
- Design system pass: oklch token palette, motion primitives with
  `prefers-reduced-motion` discipline, Lucide kind glyphs, count-up
  ticker, sliding tab indicator, scroll-progress hairline.
- Cancel-email draft surfaced in the playbook panel.
- Contributing guide; repo identity de-scaffolded (package.json was the
  generator's).

### Fixed
- "Load sample" appended duplicates instead of replacing; destructive
  confirms moved off `window.confirm`; CI branch filter mangled in
  history and corrected.

## [1.0.0] — 2026-10-03

### Added
- First release: 9 money-date kinds, radar with rings and urgency, $-at-risk
  ticker, playbooks, APR cliff calculator, T-7/T-2/day-of alerts,
  while-you-were-away report, IndexedDB + localStorage store, PWA shell
  (manifest, service worker, icons), 26 core tests, MIT license.
