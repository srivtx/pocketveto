# Autopay detection — the honest ladder

How PocketVeto finds the charges you forgot. Every rung is graded on
what it can actually read, not what marketing wishes it could.

## Where we are (v1.4.0)

| Rung | Channel | Status |
|---|---|---|
| 1 | **Share** — share a payment SMS/notification into the installed PWA (Android) | shipped |
| 2 | **Paste** — bank/card statement text or CSV, parsed on-device | shipped |
| 3 | **Android app** — notification listener + optional bank-SMS receiver capture payments automatically | **shipped** (`android/`, APK from Releases) |
| 4 | Inbox adapter — opt-in Gmail receipt scan | designed, not built |
| 5 | Bank aggregation — India AA (Setu/Finvu) or Plaid-style open banking | research only |

Rung 3 is the one people actually want: install the APK, flip one switch
(*Notification access* in system settings), optionally allow bank SMS —
and every PhonePe/GPay/Paytm/bank payment notification lands in the Scan
tab as a ready-to-track card. The native side captures **raw text
only**; parsing (amounts, payees, dates, cadence, promo/OTP rejection)
runs in the same tested detector as the web flows, entirely on-device.

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

- The APK is built by public CI from this repository — reproducible,
  source-auditable, signed with the committed sideload key.
- At install, choose **"Scan app"** when Play Protect asks — it is a
  genuinely good idea for any APK.
- For updates without Play: **Obtainium** (FOSS) tracks GitHub Releases
  and updates this app in one tap — the recommended install path.
- If Play distribution ever matters more than the SMS permission, the
  TWA track (rung-3-free, share/paste only) is the Play-safe subset.

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
  (Google Play Policy Center) — the reason rung 3 ships as a sideload.
- Sideload tightening 2025–26: Google unverified-app blocking (Aug
  2025), new multi-step sideload flow (Android Authority, Mar 2026).
- TWA: developer.android.com / developer.chrome.com overviews.
- India AA: Sahamati ecosystem, Setu/Finvu docs, FOLO funding (2025).
