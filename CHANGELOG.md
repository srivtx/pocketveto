# Changelog

All notable changes to PocketVeto are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/).

## [1.5.2] — 2026-10-06

### Added — the Copilot PR, reviewed and properly ported
- **PWA fallback copy wherever the APK is offered.** If a device policy
  (enterprise / Advanced Protection) blocks sideload installs, the
  download toast, the Android strip on the landing page, the README,
  android/README and docs/autodetect.md now all say the same honest
  thing: that safeguard is platform-side and is not bypassed — use the
  browser's *Install app* path instead (Share/Paste capture still work;
  only notification-listener auto-capture needs the APK).
- The manual-run (workflow_dispatch) artifact upload now includes the
  `.sha256` sidecar alongside the APK.

### Changed — touch detail
- The shell's bottom scroll padding now adds `env(safe-area-inset-bottom)`
  so the last rows clear the taller bottom nav on gesture-nav devices.
- The radar container is `touch-pan-y select-none`: vertical pans scroll
  the page instead of fighting the blips, and quick taps can't smear
  text selection. (Blip hit targets were already 44px since 1.5.1.)
- The boot scene says what it's doing ("Loading your on-device radar
  data.") over a soft two-stop glow — a native-feeling first frame for
  slow storage reads.

### Not taken from the PR (reviewed, rejected)
- Its `.pv-mobile-canvas::before` backdrop was dead CSS — a z-index:-1
  pseudo-element paints *under* the shell's opaque `bg-ink-950`, so it
  never rendered (v1.5.1's background-image vignette on the shell root
  does the same job and is verified live).
- Its radar `clamp(280px, 92vw, 340px)` width overflows 320px screens
  (92vw = 294px vs 288px available). Kept `width: 340, maxWidth: 100%`.
- Its `pointer: coarse` timing block targeted the blip *button*, but the
  transition lives on the dot *span* — a no-op. Skipped.

## [1.5.1] — 2026-10-06

### Added — trust the artifact, not the re-host
- **CI now verifies the APK signature before publishing.** Between
  `assembleRelease` and the Release upload, the workflow runs
  `apksigner verify --verbose --print-certs` on the finished APK and
  fails the release if the signature is wrong — the signer cert digest
  also lands in every build log, so a tampered build can never ship
  silently.
- **Every release ships a `.sha256` sidecar.** Both release filenames
  get a checksum file; `sha256sum -c PocketVeto-android.apk.sha256`
  after downloading proves the bytes on disk are the exact bytes CI
  verified. README, android/README and docs/autodetect.md explain it.

### Changed — phone-canvas polish
- Radar blip hit targets grew from 36px to 44px (the touch-target
  floor native platforms recommend); the dot itself is unchanged.
- FAB and blip scale interactions are now `motion-safe` — devices
  running reduced-motion get no scale animation at all (keyframe
  animations were already covered by the global reduced-motion rule).
- The boot scene uses `min-h-dvh` (dynamic viewport height) like the
  rest of the shell, so it can't overshoot on browser-chrome-less
  WebViews.
- A subtle phone-only canvas vignette (single static radial wash,
  ~4% white, `dvh`-proportioned, off at `md+`) replaces the perfectly
  flat ink field — enough depth to feel native, quiet enough to stay
  canvas-clean. It's a background-image layer on the shell root, so it
  can never sit over text.

## [1.5.0] — 2026-10-06

### Added — the Payments ledger (the split, done carefully)
- **A new Payments tab: every captured payment now lands in a spend
  ledger instead of pretending to be a subscription.** The bottom nav
  reads Radar · Items · Scan · Payments · Settings — and the old "Saved"
  victory lap moved into the Items list as a filter chip (nothing lost,
  one tab freed). The shell is still five equal cells, icons dead-center.
- **A real classifier decides where money goes.** Each captured payment
  is filed as an autopay (feeds the radar) or a one-off (ledger only) by
  rule priority: matches an item you already track → the notification
  itself says autopay / mandate / e-mandate / NACH / EMI → known
  subscription brand (the local catalog) → the ledger's own repeat
  pattern (same payee, near-same amount, 18–400 day gap). Ambiguity
  always falls to one-off — nothing sneaks into the subscription tracker.
  Every record carries the reason and the raw notification line as
  evidence, shown in a detail sheet.
- **"Total spent" — today and this calendar month, split autopay vs
  one-off.** A summary card on the Radar and at the top of Payments,
  with the count, the split, and an honest zero state. Totals sum the
  ledger alone, so the radar, the ledger and the totals can never
  disagree.
- **Ledger detail sheet + promote path.** Tap any payment to see the
  evidence, why it was filed that way, and its linked radar item. A
  one-off that turns out to repeat can be promoted to the radar by hand
  — the classifier never does that on its own.
- **Manual payments.** A small add-payment form (payee, amount, date)
  for payments no notification caught; it classifies like a captured
  one and counts in the totals the same way.
- **The capture flow auto-records.** Draining captured notifications
  (or a share into the app) now writes every parsed payment to the
  ledger in one pass, with a "N payments saved — X autopay · Y one-off ·
  Z duplicates skipped" report and a jump into Payments. Manual
  paste-and-detect runs still never write — statement history never
  double-counts, one-offs save per-card.
- **Dedupe that keeps totals honest.** Same payee + amount + date is
  one payment; a re-posted undated notification of a payment already
  kept (within 3 days) is skipped, not re-counted. Both the ledger and
  the in-flight batch are checked.
- **Schema 2 storage + export v2.** IndexedDB gains a `payments` store
  (v1 databases upgrade in place), the export format carries items and
  payments (v1 files still import), and Clear-all/Demo-data cover both
  stores. Sample data now seeds a ledger so the demo shows real totals.
- **Self-test grew to 9 checks** — it now proves the split itself:
  Netflix lands as an autopay, Ravi's transfer stays a one-off in the
  ledger, the totals add up (649 today / 1298 this month, 948 + 350),
  and the promote path works by hand only. Pinned by 19 new tests in
  `tests/payments.test.ts` (106 total).

### Changed
- Scan's one-off cards say what they are now: "Save" writes to the
  Payments ledger; a saved autopay offers "Track it"; a saved one-off
  shows "In Payments" — no more "Add" implying a subscription.
- Settings data rows count items and payments; the danger zone and
  demo-data copy cover the ledger.

## [1.4.4] — 2026-10-06

### Fixed
- **PocketVeto was invisible in Android's "Notification access" list —
  the bug behind "autopay detection isn't capturing".** The listener
  service was declared without the required
  `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` attribute, and
  Android silently drops such services from the Special-app-access list —
  the app never appeared there, so the toggle could never be flipped.
  Confirmed against the shipped v1.4.3 APK bytes (the permission string
  is absent from its manifest); fixed, and the service is now exactly the
  shape the platform documents. The detection engine is actually
  reachable now.
- **"Turn on alerts" was a dead button inside the APK.** The Web
  Notification API cannot be granted in a bare WebView (no permission
  UI — Chromium auto-denies), so the web flow could never succeed and
  PocketVeto never showed up as a notification-posting app. Alerts are
  native now: the bridge fires the real Android 13+ POST_NOTIFICATIONS
  runtime prompt, posts real system notifications on a proper
  "Money-date reminders" channel (ring-dot status icon, signal accent),
  and deep-links to the app's own notification settings. Browsers and
  installed PWAs keep the plain web path.
- **Settings rows no longer crunch.** The v1.4.3 rows placed a
  shrink-0 control cluster (status chip + button, up to ~180px) on the
  same line as the label, squeezing the text column to ~150px on a
  390px phone — copy crumbled into one-word-per-line stacks. Rows now
  stack on phones (title → support → full-width control line) and go
  side-by-side from `sm` up. The cramped self-test panel, data rows and
  danger zone all inherit the fix.

### Changed — settings, the clean pass
- Settings sections wear canvas-style micro-labels above solid cards
  (one elevation, hairline borders) instead of in-card header rows on
  translucent plates — the whole screen is quieter and every row has
  room to breathe.
- The notification-access row now tells the user exactly what to allow:
  open the system screen, find PocketVeto, flip the toggle — with the
  naming variations ("Notification access" on stock Android,
  "Device & app notifications" on Samsung) spelled out in the row.
- A dedicated "App notification settings" row deep-links to Android's
  own screen for this app (channel, importance, master toggle), keeping
  the two different system screens (read others' notifications vs post
  your own) clearly separated.
- All app cards moved from translucent fills to solid surfaces — crisper
  plates over the app background, one consistent elevation.

## [1.4.3] — 2026-10-06

### Fixed
- **The tutorial that grew past the screen.** Two problems, one rewrite:
  - *Root cause — the leaking containing block:* the scene animation
    held an identity `transform` after finishing, which silently turned
    the page wrapper into the containing block for every `position:
    fixed` descendant. The tutorial modal anchored to the *document's*
    middle instead of the viewport's, the bottom nav and FAB rendered
    *below the visible screen*, and toasts covered the app bar. The
    animation now ends with `backwards` fill so the transform truly
    returns to `none` (documented in globals.css — this trap bit twice).
  - *The rewrite:* the first-run tutorial is now a full-screen
    onboarding flow (the native pattern): fixed top bar, centered
    content, and an action bar that is always on screen — it cannot
    exceed the viewport on any device. Background scroll is locked
    while it is open; Escape and Skip both dismiss.
- Toasts moved to the bottom of the screen, above the nav bar
  (snackbar behavior) — a toast sliding over the app bar from the top
  is a website tell. On first run the "payments captured" toast stays
  quiet so the tutorial owns the stage; the Scan badge carries the
  signal.
- The FAB ducks out of the way on scroll-down and returns on
  scroll-up, so it never parks over the text the user is reading.

### Changed — the app shell now behaves like a phone app
- **Bottom navigation bar** on phones: five equal-width cells, icons
  dead-center, active hairline indicator + color, capture and saved
  badges. Desktop keeps the top tab row.
- **Floating action button** (+) for adding a money date on phones;
  the header keeps its Add button on desktop.
- Inside the APK there is no website furniture: no marketing footer,
  no "back to the site" — the brand in the app bar is the app bar.
- App chrome is non-selectable with no tap flash; the page doesn't
  rubber-band at the scroll ends.

### Added
- **Settings grew up** (the "is it even working?" screen):
  - **Autopay detection** section — live notification-access status
    (with the jump to system settings), captures waiting, and a
    **detection self-test** that runs the real parser over canned
    PhonePe/Paytm/bank-SMS notifications (plus promo/OTP junk it must
    reject) and shows each check. Provable, on-device, no payment
    needed. In the browser the same test proves the parser; capture
    itself is APK-only.
  - Send-a-test-alert button (T-7 shape preview) once alerts are on.
  - Replay-the-intro row — the walkthrough is re-runnable, not a
    once-only secret.
  - About section with live version (the APK reports its build), links
    and the privacy line.
- The detection self-test is pinned by CI (`tests/selftest.test.ts`)
  — detector regressions now fail the build before any APK ships.

## [1.4.2] — 2026-10-06

### Fixed
- **The blank screen — both layers of it.**
  - *Layer 1, the 404:* v1.4.1 (and v1.4.0 before it) bundled the web
    export into `assets/web/` while the shell loaded the virtual origin's
    root — `WebViewAssetLoader` answered 404, and the WebView showed
    "webpage not available". The export now ships at the assets root and
    the shell loads `index.html` directly, matching the app's own
    root-absolute references.
  - *Layer 2, the missing payload:* Android's aapt2 **silently drops any
    asset directory starting with an underscore** (default ignore
    pattern `<dir>_*`) — so every APK so far shipped an `index.html`
    whose `/_next/` script tags pointed at chunks that were never
    packaged. Even past the 404, the page would have loaded no JS. The
    bundler (`scripts/prepare-android-assets.mjs`, shared by CI and
    local runs) now renames `_next` → `pvpkg`, rewrites every
    reference, and hard-fails if any underscore directory or stale
    `_next/` reference survives.
- The service worker no longer registers inside the APK: the whole site
  is bundled in the app, and a surviving SW cache could serve stale
  chunks from a previous version after an update.

### Added
- **Real brand logos on the cards.** Recognized merchants (Netflix,
  Hotstar, Spotify, Prime Video, YouTube, Jio, Airtel, Swiggy, Zomato,
  …) carry their actual marks — embedded simple-icons path data
  (CC0), rendered locally. No network fetch, ever: the "nowhere to
  phone home" promise holds. Brands whose wordmark would smear at
  tile size (SonyLIV, Zomato, GoDaddy, ZEE5, Gaana, cult.fit,
  Disney+, Peacock) get a clean letter in the brand's color instead,
  and unknown merchants get a quiet monogram — same geometry, no
  placeholder feel.
- Cards redesigned around the marks: one 40px soft-square tile per
  card — brand logo when known, monogram when not — with a tighter
  text hierarchy (name + badge, one meta line, money on the right).
  Known-brand scan cards drop the redundant confidence bar; the bar
  stays where it carries real signal (unknown merchants). Scan
  results and the radar list share the same geometry.

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
