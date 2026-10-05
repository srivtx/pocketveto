# PocketVeto for Android

A thin native shell around the PocketVeto web app, plus the capture
engine that makes autopay detection automatic on a phone:

- **`PaymentListenerService`** — reads payment notifications (PhonePe,
  Google Pay, Paytm, banks, card apps) once you flip the *Notification
  access* switch in system settings.
- **`SmsReceiver`** — optional bank-SMS capture (`RECEIVE_SMS`), granted
  at runtime from inside the app, off by default.
- **`MainActivity`** — a WebView serving the bundled web export over
  `https://appassets.androidplatform.net/` (via `WebViewAssetLoader`),
  so IndexedDB storage and the whole PWA behave exactly like on the web.
  No network is used — every byte is served from the APK's assets.

The native side captures **raw text only**. Parsing (amount, payee,
date, cadence, promo/OTP rejection) happens in the web layer's tested
detector — one parser, one truth — and nothing ever leaves the device.

## Build

The APK is built by CI (`.github/workflows/android.yml`) on every `v*`
tag and attached to the GitHub Release:

```bash
bun install
bun run build:static                 # NEXT_STATIC=1 → out/
mkdir -p android/app/src/main/assets/web
rsync -a --delete out/ android/app/src/main/assets/web/
cd android && gradle assembleRelease  # needs JDK 17 + Android SDK 35
```

Output: `android/app/build/outputs/apk/release/app-release.apk`.

## Sideload, on purpose

The app is not on Play Store. Store review restricts the SMS permission
group to default-handler apps, and the whole point of this app is
honest, local, permission-scoped capture. Sideloaded APKs install with
one "allow unknown apps" tap and update in place.

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
| `RECEIVE_SMS` | optional bank-SMS capture | runtime prompt, from the Scan tab |

Every capture stays in the app sandbox until you open PocketVeto, where
the raw text is parsed on-device and shown as review cards. The queue is
capped at 60 and cleared when you review it.
