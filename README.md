<div align="center">

# PocketVeto

**One radar for every date your money moves.**

[![CI](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml/badge.svg)](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml)
[![Android build](https://github.com/srivtx/pocketveto/actions/workflows/android.yml/badge.svg)](https://github.com/srivtx/pocketveto/actions/workflows/android.yml)
[![Latest release](https://img.shields.io/github/v/release/srivtx/pocketveto?style=flat-square&color=8B7E5A)](https://github.com/srivtx/pocketveto/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-114%20passing-3ddc97?style=flat-square)](tests/)
[![Platform](https://img.shields.io/badge/platform-Android%20%C2%B7%20PWA-162032?style=flat-square)](#get-pocketveto)

</div>

**PocketVeto** is a privacy-first, on-device autopay and subscription radar for Android.
Trials, renewals, warranties, gift cards, 0% APR windows, passport and domain expiry dates —
every money date becomes a blip closing in on a live radar, with a `$ at risk` ticker and an
action playbook per item. No account, no bank link, no server: everything stays on your
device.

```bash
git clone https://github.com/srivtx/pocketveto.git && cd pocketveto
bun install && bun run dev     # http://localhost:3000
bun test                       # 114 tests
```

---

## Why

Autopay is designed to be forgotten. Money moves silently on schedules you approved once —
a free trial converting at 2 a.m., a card's 0% APR window expiring into 24% retroactive
interest, a warranty dying the week before the failure. Every subscription tracker on the
market that "solves" this asks for the one thing that makes the cure worse than the disease:
read access to your bank account.

PocketVeto takes the opposite position: **the phone already sees the money move.** Payment
notifications, shared receipts, pasted statements — the evidence is already on the device,
thrown away by default. PocketVeto captures it, parses it, classifies it, and files it by
evidence — and never lets anything leave the device. The network tab stays silent by
architecture, not policy.

## Get PocketVeto

- **Android app** — [download the APK](https://github.com/srivtx/pocketveto/releases/latest/download/PocketVeto-android.apk)
  and flip one switch (*Notification access*): PhonePe / GPay / Paytm / bank payment
  notifications land in the Payments ledger, parsed and classified on-device — autopays
  feed the radar, one-offs stay one-offs. CI verifies the signature of every APK before it
  is published, and each release ships a `.sha256` sidecar — `sha256sum -c
  PocketVeto-android.apk.sha256` after downloading proves you hold the exact bytes CI
  signed off on.
- **PWA** — use the web build in any browser; install it from the browser menu ("Install
  app").
- **v1.5.4 is a new install identity** (fresh private signing key + new package id
  `dev.pocketveto.app`): uninstall older PocketVeto first. If Play Protect blocks the
  install with no "Install anyway" option, pause *Scan apps with Play Protect* during the
  install and re-enable it after — exact steps in
  [android/README.md](android/README.md#when-play-protect-blocks-the-install-no-install-anyway).

<div align="center">
  <img src="docs/screenshots/radar.png" alt="The radar — every money date closing in" width="640" />
</div>

## How it works

### Autopay detection, three ways in

- **Android app (Notification access)** — payment notifications are parsed and classified
  on-device as they arrive.
- **Share (installed PWA, Android)** — share any payment notification or receipt straight
  in.
- **Paste** — a bank/card statement; recurring charges are found by cadence, amount, and a
  local catalog of known subscription brands.

### The detection ladder — evidence, not guesses

Every captured payment is filed by evidence: a tracked item, mandate/EMI wording, a known
brand, a repeat pattern. Anything ambiguous stays a one-off in the ledger — never a fake
subscription. The full ladder, with examples and failure modes, is documented in
[docs/autodetect.md](docs/autodetect.md).

**Total spent** (today / this month, split autopay vs one-off) sums it all without touching
the radar's math.

### Privacy architecture

- **No account.** Nothing to sign up for, nothing to leak.
- **No bank link.** The app never asks for financial credentials.
- **No server.** The web build is a static export; the Android build is a thin WebView
  shell around it. Data lives in local storage on your device.
- **Local parsing.** Notification text is parsed on-device by
  [src/lib/pocketveto/notifications.ts](src/lib/pocketveto/notifications.ts), classified
  by [payments.ts](src/lib/pocketveto/payments.ts), and validated by a built-in
  self-test ([selftest.ts](src/lib/pocketveto/selftest.ts)) that ships with 114 unit tests.

## Build the Android APK

```bash
bun run build:static           # web export → out/
cd android && gradle assembleRelease   # JDK 17 + Android SDK 35
```

CI builds and signs it on every tag — details in [android/README.md](android/README.md).

## Repository layout

```
├── .github/workflows/   # ci.yml (tests + lint) · android.yml (APK build + sign)
├── src/                 # PocketVeto web app (Next.js static export)
│   └── lib/pocketveto/  # notifications / payments / seed / selftest / types
├── android/             # bare WebView shell (Kotlin)
├── docs/                # detection ladder (autodetect.md) + screenshots
└── tests/               # 114 tests
```

## Documentation

- [Detection ladder](docs/autodetect.md) — how a notification becomes a radar blip
- [Android build & Play Protect](android/README.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

---

[Latest release](https://github.com/srivtx/pocketveto/releases/latest) · [Detection ladder](docs/autodetect.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · MIT

*Local-first by architecture, not policy — the network tab stays silent.*
