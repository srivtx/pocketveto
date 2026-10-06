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

CI signs automatically: the release key is decoded from the repo's
`PV_*` Actions secrets (`PV_KEYSTORE_BASE64`, `PV_STORE_PASSWORD`,
`PV_KEY_ALIAS`, `PV_KEY_PASSWORD`) into the gitignored
`android/keystore/pocketveto-release.jks`. For a **local** signed build,
export the same four variables (`PV_STORE_FILE` is the keystore path
relative to `android/`) — without them, `assembleRelease` produces an
unsigned APK on purpose, and the workflow fails loudly rather than
publishing one.

Before publishing, CI runs `apksigner verify --print-certs` on the
finished APK and pins the v1.5.4 release-key digest — a build signed by
any other key cannot publish. A `.sha256` sidecar is written for both
release filenames. After downloading:

```bash
sha256sum -c PocketVeto-android.apk.sha256
```

If that prints `OK`, the bytes on your disk are the exact bytes CI
verified — no re-hosted or modified APK.

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

**The v1.5.4 identity reset, and why it was needed.** Removing the SMS
receiver fixed the app but did not fix the *install*: Play Protect
caches its verdict per **(package name + signing certificate)**, and
PocketVeto kept shipping the *same* pair (committed public keystore,
`dev.pocketveto.android`) it had when first flagged — so every release,
however clean, re-matched the cached "harmful" verdict. That is the
classification tier whose dialog offers **no "Install anyway"** and
which removes the app right after install ("Play Protect removed an
app"). v1.5.4 therefore ships as a genuinely new identity:

- a **new, private signing key** (Actions secrets — see below),
- a **new application id** (`dev.pocketveto.app`; the Kotlin namespace
  is unchanged, and every component check in the shell uses the runtime
  package name, so the split is safe),
- a bumped `versionCode`.

Uninstall any older PocketVeto before installing v1.5.4 — a different
signature cannot update in place, and there is no data to migrate
through a blocked install anyway.

Install-time safety behavior is still controlled by Android/Play Protect:

- Some devices (especially with stricter enterprise or Advanced Protection
  policies) can block sideload APK installs outright.
- PocketVeto does not bypass or weaken those safeguards.
- If sideloading is blocked on your device, use the installed PWA path
  (browser menu → **Install app / Add to Home Screen**) instead — capture
  via Share and Paste still works there, only notification-listener
  auto-capture needs the APK.

### When Play Protect blocks the install (no "Install anyway")

The "unsafe app blocked" dialog has two tiers: the soft one (unknown
app) offers **More details → Install anyway (unsafe)**; the hard one
(harmful-class verdict) offers nothing. If you land on the hard tier —
or the app installs and is removed minutes later with a "Play Protect
removed an app" notification — pause the scan for the install:

1. Open the **Play Store** → tap your **profile icon** → **Play Protect**
   → **Settings (⚙)**.
2. Turn **off** *Scan apps with Play Protect* (and, if shown, *Improve
   harmful app detection*).
3. Install the PocketVeto APK (verify it first:
   `sha256sum -c PocketVeto-android.apk.sha256`).
4. Turn scanning **back on**. A fresh-signed identity starts with a clean
   record; if it is ever flagged again, that is new information worth
   reporting — not a verdict inherited from the old identity.

OEM variants: on some Xiaomi/Redmi (MIUI) and Samsung devices the scan
lives in the OEM's "security" app too (MIUI: Security → settings;
Samsung: Device care). The Play Store path above is the one that governs
Play Protect itself.

The long-term fix for reputation is the Play Console's open-testing
track ($25 once, if PocketVeto ever wants it).

## Signing key

**Private, and only in Actions secrets.** `PV_KEYSTORE_BASE64` (the
base64 of `keystore/pocketveto-release.jks`), `PV_STORE_PASSWORD`,
`PV_KEY_ALIAS`, `PV_KEY_PASSWORD`. The workflow decodes it at build
time into the gitignored `android/keystore/` directory; the signer
certificate's SHA-256 is pinned in the workflow so no other key can
publish a release. If the key is ever lost, releases can still be cut
by generating a new key, updating the secrets and the pinned digest —
users then uninstall/reinstall (updates across different signatures
are impossible by Android design).

History: v1.4.0–v1.5.3 shipped a keystore committed *publicly* on
purpose (sideload continuity over secrecy). That identity is retired:
it carried the cached Play Protect verdict described above, and a
public signing key is by definition not a trustworthy identity. It
remains in git history, uselessly — it signs nothing anymore.

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
