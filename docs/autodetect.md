# Autopay detection — the honest ladder

How PocketVeto finds the charges you forgot. Every rung is graded on
what it can actually read, not what marketing wishes it could.

## Where we are (v1.5.0)

| Rung | Channel | Status |
|---|---|---|
| 1 | **Share** — share a payment SMS/notification into the installed PWA (Android) | shipped |
| 2 | **Paste** — bank/card statement text or CSV, parsed on-device | shipped |
| 3 | **Android app** — notification listener captures payments automatically | **shipped** (`android/`, APK from Releases) |
| 4 | Inbox adapter — opt-in Gmail receipt scan | designed, not built |
| 5 | Bank aggregation — India AA (Setu/Finvu) or Plaid-style open banking | research only |

Rung 3 is the one people actually want: install the APK, flip one
switch (*Notification access* in system settings) — and every
PhonePe/GPay/Paytm/bank payment notification lands in the ledger as a
classified payment. The native side captures **raw text only**; parsing
(amounts, payees, dates, cadence, promo/OTP rejection) runs in the same
tested detector as the web flows, entirely on-device.

### Where a captured payment lands (v1.5.0 — the split)

Every captured payment is recorded in the **Payments ledger** first,
then classified:

| Evidence | Filed as | Lands |
|---|---|---|
| Matches an item you already track | autopay (linked) | ledger + that item's history |
| Text says autopay / mandate / e-mandate / NACH / EMI | autopay | ledger, offered to the radar |
| Payee is a known subscription brand (local catalog) | autopay | ledger, offered to the radar |
| Same payee, near-same amount, 18–400 days apart (ledger's own pattern) | autopay | ledger, offered to the radar |
| Anything else | **one-off** | ledger only — never the radar |

Ambiguity always falls to one-off. A one-off can be promoted to the
radar by hand (the promote button in the payment detail sheet); the
classifier never does it on its own — that bias is the whole point of
the split: renewal predictions stay accurate, and "total spent" counts
everything anyway (today / this month, split autopay vs one-off).

Dedup keeps the totals honest: the same payee + amount + date is one
payment, and a re-posted undated notification of a payment already
recorded (within 3 days) is skipped, not re-counted.

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

## When Android turns it back off (v1.5.3)

You flip the Notification access switch on, everything works, and some
days later it looks like the permission is gone again. This is not
PocketVeto losing the grant — it is documented Android behavior:

- **Installing an app update silently unbinds a granted
  NotificationListenerService.** Every sideloaded PocketVeto release
  lands in this state. Worse, the settings toggle can stay *on* while
  nothing is delivered — so "on" alone was never honest proof that
  captures were flowing.
- Force-stopping the app, some OEM battery sweeps (MIUI *Autostart*
  off, Samsung putting the app to sleep) and a few update paths on
  older Androids do the same thing.

What v1.5.3 does about it:

1. **Self-healing:** every time you bring the app to the front,
   the native shell checks whether the grant is on record but the
   engine hasn't been bound since this app version was installed —
   and calls `NotificationListenerService.requestRebind()` (the
   system API for exactly this state). Capture comes back with no
   prompts, no settings trip, usually before you notice.
2. **Honest status:** Settings and the Scan card show three states —
   *On · live*, *On · idle* (amber, with a one-tap **Wake capture**),
   and *Off*. No more silent failure between the toggle and the truth.
3. **Never a gate:** the app is fully usable with capture off — paste,
   share and manual entry all keep working, queued captures stay
   reviewable, and the capture card's *Not now* collapses it for the
   visit. The alerts banner's *Later* is remembered too.

If **Wake capture** doesn't stick, an OEM battery manager is holding
the binding: MIUI users set PocketVeto to *Autostart* on and *No
battery restrictions*; Samsung users remove it from *Sleeping apps*.
The switch itself being *off* means the grant is genuinely gone — one
trip to the system screen flips it back, and the self-heal keeps it
flipped after every future update.

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
- **v1.5.4 reset the install identity.** Removing the SMS receiver fixed
  the app, but Play Protect caches its verdict per **(package name +
  signing certificate)** — and the project kept releasing under the exact
  pair it had when first flagged, so every clean release still re-matched
  the cached "harmful" verdict: the block dialog with *no* "Install
  anyway", or the app vanishing minutes after install ("Play Protect
  removed an app"). v1.5.4 ships under a **new, private signing key**
  (GitHub Actions secrets — the old one was public in the repo and is
  retired) and a **new package id** (`dev.pocketveto.app`), i.e. an
  identity with no history. Uninstall older versions first; a different
  signature cannot update in place.
- **If Play Protect still shows the hard block** (no "Install anyway"):
  Play Store → profile icon → Play Protect → ⚙ Settings → turn *off*
  "Scan apps with Play Protect" → install the APK (verify:
  `sha256sum -c PocketVeto-android.apk.sha256`) → turn scanning *back
  on*. The long-term reputation fix is Play Console open testing, if
  that day ever comes.
- The APK is built by public CI from this repository — reproducible,
  source-auditable, signed with the private release key (CI pins the
  signer certificate digest before publishing). Every
  release re-attaches a stable filename, so
  `releases/latest/download/PocketVeto-android.apk` always resolves.
- Since v1.5.1, CI runs `apksigner verify --print-certs` on the APK
  before publishing and ships a `.sha256` sidecar with each release —
  `sha256sum -c PocketVeto-android.apk.sha256` confirms the download is
  bit-identical to what CI verified.
- At install, choose **"Scan app"** when Play Protect asks — it is a
  genuinely good idea for any APK.
- If Android still auto-removes or blocks the install under a device
  policy, that safeguard cannot be bypassed by this project — use the
  PWA install path (browser menu → Install app) instead.
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
