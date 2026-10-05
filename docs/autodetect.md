# Auto-detecting payments — the honest map

Where each detection path works, what it costs, and what it can never do.
This is the research behind the roadmap's detection ladder, kept current as
rungs ship.

## Why a web app cannot just read your payments

A browser (and therefore a PWA) is sandboxed away from the OS on purpose:
no reading other apps' notifications, no SMS inbox, no transaction feed
from GPay, PhonePe, or Apple Wallet. That boundary is a feature — every
app that promises "automatic detection" from a browser is either reading
something you pasted, or asking for a server-side connection you granted.
There is no adapter API for PhonePe/GPay/Apple Pay consumer transactions
that a third-party web app may call. Detection therefore comes from one
of four places, in this order:

## The ladder

| Rung | What | Status |
|---|---|---|
| 1 | **Share Target** — from any app (SMS, GPay/PhonePe notification, receipt email), tap Share → PocketVeto. The text is parsed on-device: ₹/Rs/INR/$ amounts, DD-MM-YY bank-SMS dates, payee extraction, promo/OTP lines rejected. | **Shipped (v1.3)** |
| 2 | **Inbox scan adapter** — opt-in Gmail connection (OAuth, your own scope-limited token) that reads receipt/renewal emails from known senders and proposes items. Runs against your own Supabase backend — the same adapter boundary the store layer already defines. | Roadmap |
| 3 | **Android companion — NotificationListenerService** — the real "add it automatically": a thin native layer that watches payment notifications, parses them with the same `scan.ts` engine rules, and hands them to PocketVeto (local intent/deep link, no cloud). Requires the user to grant Notification access in system settings; data never leaves the device. | Roadmap |
| 4 | **Bank aggregation** — Plaid (US/EU), the RBI's **Account Aggregator** framework (India — consent-based, via licensed AAs/Setu), TrueLayer (UK/EU). Full transaction feeds, opt-in, each with its own compliance overhead. | Later |

Rung 3 is what "detect the autopay when I pay" fully means on Android. It
needs a native wrapper — see below. On iOS, rung 3 does not exist for
third parties; share-sheet and paste are the honest ceiling.

## Can we make an Android app? Yes — three ways

| Path | What it is | Gets us | Cost |
|---|---|---|---|
| **Trusted Web Activity (TWA)** | The existing PWA wrapped with Bubblewrap; Play Store lists it, Chrome renders it fullscreen. | Store presence, zero new code, same update pipeline | ~an afternoon; no notification access |
| **Capacitor** | The same web app in a native shell with a plugin bridge. | NotificationListenerService as a plugin → rung 3 becomes real | A small Kotlin plugin + build tooling; Play review for the permission disclosure |
| **Full Kotlin** | A native rewrite. | Everything | Weeks; duplicates the product |

**The plan:** ship the TWA now for presence (nothing about the PWA
changes — same URL, same offline shell); move to Capacitor when the
notification listener is built. The listener runs as a foreground-aware
service that: matches notifications against payment patterns (the same
verb/amount/payee grammar `parsePaymentText` owns), dedupes, and opens
PocketVeto with the parsed payload as a deep link — the user confirms
the track, nothing is uploaded. If the notification grammar fails, fall
back to asking the user to share the text manually (rung 1).

## Play policy notes (checked 2026-10)

- **SMS / Call Log permission groups are restricted**: only
  default-handler use cases (dialer, SMS apps) pass review. A
  PocketVeto that reads the SMS inbox directly would be rejected — which
  is fine: the notification path (and the share sheet) need none of it.
- **NotificationListenerService** is *special app access*, not a
  runtime permission: the user flips it on in system settings, and Play
  review requires a clear disclosure + privacy policy for apps that
  read notifications. Financial-data handling rules apply.
- **TWA/Capacitor** both pass the standard app review; the listener
  disclosure is the only sensitive part.

## The Apple side (honest)

There is no public API for a third-party app to read Apple Wallet /
Apple Pay transaction history. Wallet's order tracking is merchant-side.
So on iOS: Share sheet → PocketVeto (Safari's Add to Home Screen app
supports share targets), or paste. That is the platform's ceiling, and
it is stated in the app rather than papered over.

## Sources

- Android `NotificationListenerService` (API 18+) — developer.android.com
- Google Play Console policy: Use of SMS or Call Log permission groups
- Web Share Target — Chrome 89+ (developer.chrome.com/docs/web-platform/web-share-target)
- Account Aggregator framework — Sahamati (sahamati.org.in), Setu
- Bubblewrap (TWA packaging) / Capacitor docs
