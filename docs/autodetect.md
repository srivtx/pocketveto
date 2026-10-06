# Autopay detection — the honest ladder

How PocketVeto finds the charges you forgot. Every rung is graded on
what it can actually read, not what marketing wishes it could.

## Where we are (v1.4.4)

| Rung | Channel | Status |
|---|---|---|
| 1 | **Share** — share a payment SMS/notification into the installed PWA (Android) | shipped |
| 2 | **Paste** — bank/card statement text or CSV, parsed on-device | shipped |
| 3 | **Android app** — notification listener captures payments automatically | **shipped** (`android/`, APK from Releases) |
| 4 | Inbox adapter — opt-in Gmail receipt scan | designed, not built |
| 5 | Bank aggregation — India AA (Setu/Finvu) or Plaid-style open banking | research only |

Rung 3 is the one people actually want: install the APK, flip one
switch (*Notification access* in system settings) — and every
PhonePe/GPay/Paytm/bank payment notification lands in the Scan tab as a
ready-to-track card. The native side captures **raw text only**; parsing
(amounts, payees, dates, cadence, promo/OTP rejection) runs in the same
tested detector as the web flows, entirely on-device. Recognized brands
are flagged as *known subscriptions* (a local catalog — no server), so
two captures with a fitting rhythm are enough, even across a plan-price
change.

## Turning it on — and proving it works

Two different system screens are involved, and mixing them up is the
classic confusion (it bit this project too):

| Screen | What it controls | How to reach it |
|---|---|---|
| **Notification access** (special app access) | PocketVeto *reading* other apps' notifications — the capture engine | Settings → Special app access → Notification access → PocketVeto → On. Samsung labels it *Device & app notifications*; it lives under Settings → Notifications there. |
| **PocketVeto's own notifications** | The app *posting* its T-7/T-2/day-of reminders | Android 13+ asks via the system runtime prompt when you tap *Turn on alerts* in the app; afterwards Settings → Apps → PocketVeto → Notifications. |

**v1.4.4 fix worth knowing about:** the listener service was originally
declared without the `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`
attribute — and Android *silently* omits such services from the
Notification access list. The app installed fine, the settings button
opened the right screen, and PocketVeto simply wasn't in the list. The
attribute is present now (and verified against release APK bytes); if
you ever rebuild a fork, check that first.

To prove detection works on your phone:
1. Settings → Autopay detection → **Notification access** should read *On*.
2. Tap **Run self-test** — six checks over the real parser, in-app.
3. Make any small UPI payment (₹1 to a friend works) — the notification
   should land in **Scan → Captures** within moments, badge and all.
4. The row also shows a live count of captures waiting.

## Why the web alone can't do it

A browser tab — installed PWA included — is sandboxed away from other
apps' notifications and SMS by the OS, on purpose. There is no web API,
no permission prompt, and no adapter (Plaid, TrueLayer and friends are
*bank* aggregation products; none of them expose PhonePe/GPay wallet
activity to third parties). Anyone claiming a web app can read your
notifications is lying. The share sheet was always a bridge, not the
destination — the destination needed native code.

## The wrapper decision, honestly

Three ways to put a web app on Android, and why v1.4 chose the third:

| | TWA (Bubblewrap) | Capacitor | Bare Kotlin WebView (chosen) |
|---|---|---|---|
| Play Store listing | yes | yes | later, as a second track |
| Native APIs (notification listener) | no — Chrome renders the site; no service code | via plugins — but no maintained plugin exposes NotificationListenerService | direct |
| Bundled offline assets | no — needs a hosted URL | yes | yes (`assets/web`, no network at all) |
| App weight / moving parts | Chrome dependency | npm-native toolchain + bridge layer | ~1.6 MB web export + one small Kotlin shell |
| F-Droid / Obtainium friendly | n/a | yes | yes |

The APK's web layer is served through `WebViewAssetLoader` on a virtual
https origin, so IndexedDB and the whole app behave exactly like on the
web — and there is no server to phone home to, by construction.

## Sideload reality (2025–26)

Google is tightening sideloading: newer Android versions add extra
warning steps for apps outside Play, and advanced-protection users can
be blocked outright. What that means here:

- **v1.4.1 dropped the optional bank-SMS receiver.** An APK declaring
  the SMS permission group gets Play Protect's hardest treatment —
  "unsafe app blocked … identity and financial fraud" — often with no
  proceed-anyway path. Notification access is *special app access*
  (a settings toggle, not an install-time permission), so the app now
  installs through the ordinary "allow unknown apps" flow. The capture
  engine lost nothing that matters: PhonePe, GPay, Paytm and bank apps
  all announce payments through notifications.
- The APK is built by public CI from this repository — reproducible,
  source-auditable, signed with the committed sideload key. Every
  release re-attaches a stable filename, so
  `releases/latest/download/PocketVeto-android.apk` always resolves.
- At install, choose **"Scan app"** when Play Protect asks — it is a
  genuinely good idea for any APK.
- For updates without Play: **Obtainium** (FOSS) tracks GitHub Releases
  and updates this app in one tap — the recommended install path.
- If Play distribution ever matters more than auto-capture, the TWA
  track (share/paste only) is the Play-safe subset.

## Why not "just look up my subscriptions by email"?

A tempting design — sign in with Google, take the email, fetch "known
subscriptions in the country" — has a data problem and a promise
problem. The data problem: no public database maps an email address to
its subscriptions; merchants don't expose that. Every service that
"finds your subscriptions" either scans your inbox (Gmail API — a
server-side OAuth) or links your bank (Plaid / India AA — a licensed
server). The promise problem: an account, a token and a server are
exactly what PocketVeto's privacy card says it will never ask for. The
robust local-first path is what v1.4.1 ships: captured payments +
recurrence detection + a bundled catalog of known subscription brands
— automatic, and every byte stays on the phone.

## Rung 4 — inbox adapter (designed)

Gmail's API with a `gmail.readonly` scope can find receipts (Google
Play, App Store, Stripe, PayPal, Swiggy, …). It needs a registered
OAuth client, so it ships as *bring-your-own* — your client ID, your
backend (a tiny Supabase function is enough), your data. The store
layer is already the adapter boundary for this.

## Rung 5 — bank aggregation (research)

India's Account Aggregator framework (Sahamati; Setu, Finvu, FinBox…)
is the compliant path to real bank transactions — consented, revoked
per-account, auditable. It requires a licensed entity relationship and
a server, which puts it in direct tension with local-first. If it ever
ships, it ships as an explicit opt-in adapter, never as a login wall.

## Non-goals

- Reading Apple Pay / Wallet transactions — Apple exposes nothing to
  third parties; the iOS ceiling is share-sheet + paste.
- Scraping UPI apps — no public API exists; scraping private app
  internals is fragile and hostile to users.

## Sources

- NotificationListenerService — Android API docs (API 18+), special
  app access; payment-tracker usage is the established pattern.
- Play policy: SMS/Call-Log permissions restricted to default handlers
  (Google Play Policy Center) — and Play Protect's identity-fraud
  hard-block on SMS-permission APKs (field-verified on the v1.4.0
  install flow; the reason v1.4.1 is notification-only).
- Sideload tightening 2025–26: Google unverified-app blocking (Aug
  2025), new multi-step sideload flow (Android Authority, Mar 2026).
- TWA: developer.android.com / developer.chrome.com overviews.
- India AA: Sahamati ecosystem, Setu/Finvu docs, FOLO funding (2025).
