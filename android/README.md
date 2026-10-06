# PocketVeto for Android

A thin native shell around the PocketVeto web app, plus the capture
engine that makes autopay detection automatic on a phone:

- **`PaymentListenerService`** — reads payment notifications (PhonePe,
  Google Pay, Paytm, banks, card apps) once you flip the *Notification
  access* switch in system settings.
- **`MainActivity`** — a WebView serving the bundled web export over
  `https://appassets.androidplatform.net/` (via `WebViewAssetLoader`),
  so IndexedDB storage and the whole PWA behave exactly like on the web.
  It opens straight into the app view (`#app`) — on a phone, PocketVeto
  behaves like an app, not a site. No network is used — every byte is
  served from the APK's assets.

The native side captures **raw text only**. Parsing (amount, payee,
date, cadence, promo/OTP rejection) happens in the web layer's tested
detector — one parser, one truth — and nothing ever leaves the device.

## Build

The APK is built by CI (`.github/workflows/android.yml`) on every `v*`
tag and attached to the GitHub Release:

```bash
bun install
bun run build:static                 # NEXT_STATIC=1 → out/
bun scripts/prepare-android-assets.mjs   # assets/ root, _next → pvpkg
cd android && gradle assembleRelease  # needs JDK 17 + Android SDK 35
```

Output: `android/app/build/outputs/apk/release/app-release.apk`.

The bundling step is a script, not a raw `rsync`, for a reason: Android's
aapt2 silently drops asset directories starting with `_` (default ignore
pattern `<dir>_*`), which is exactly where Next.js puts its payload
(`_next/`). The script renames it, rewrites every reference, and fails
the build if anything underscore-prefixed survives.

## Sideload, on purpose

The app is not on Play Store: the whole point of this app is honest,
local, permission-scoped capture, and store review adds friction without
adding trust here. v1.4.1 dropped the optional bank-SMS receiver — its
permission group is what made Play Protect hard-block the install with
an "identity and financial fraud" warning. With notification-only
capture, the APK installs through the ordinary "allow unknown apps"
flow, and payments from PhonePe / GPay / Paytm / bank apps are still
captured automatically.

## Signing key

`keystore/pocketveto.jks` is committed to the repository **on purpose**.
It is a sideload key: it exists so every release signs consistently and
installs upgrade over the previous one. It guards nothing — treat it as
public. If PocketVeto ever ships on Play Store, the store key will be a
different, actually-private one.

## Permissions, honestly

| Permission | Why | When |
|---|---|---|
| `INTERNET` | WebView bookkeeping for the virtual https origin — no external request is ever made | install |
| Notification access (special app access) | capture payment notifications from other apps | you flip the switch in system settings |

That's the whole list. No location, no SMS, no contacts, no camera —
nothing that could flag the app as risky at install time.

Every capture stays in the app sandbox until you open PocketVeto, where
the raw text is parsed on-device and shown as review cards. The queue is
capped at 60 and cleared when you review it.
