<div align="center">

# PocketVeto

**One radar for every date your money moves.**

[![CI](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml/badge.svg)](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml)
[![APK](https://github.com/srivtx/pocketveto/actions/workflows/android.yml/badge.svg)](https://github.com/srivtx/pocketveto/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-63%20passing-3ddc97?style=flat-square)](tests/)

</div>

Trials, renewals, warranties, gift cards, 0% APR windows, passports, domains —
every money date as a blip closing in on a live radar, with a `$ at risk`
ticker and an action playbook per item. No account, no bank link, no server:
everything stays on your device.

<div align="center">
  <img src="docs/screenshots/radar.png" alt="The radar — every money date closing in" width="640" />
</div>

## Autopay detection, three ways in

- **Android app** — [download the APK](https://github.com/srivtx/pocketveto/releases/latest/download/PocketVeto-android.apk),
  flip one switch (*Notification access*): PhonePe / GPay / Paytm / bank
  payment notifications become ready-to-track cards, parsed on-device.
- **Share** (installed PWA, Android) — share any payment notification straight in.
- **Paste** — a bank/card statement; recurring charges are found by cadence,
  amount and a local catalog of known subscription brands.

## Run it

```bash
git clone https://github.com/srivtx/pocketveto.git && cd pocketveto
bun install && bun run dev     # http://localhost:3000
bun test                       # 63 tests
```

## Build the Android APK

```bash
bun run build:static           # web export → out/
cd android && gradle assembleRelease   # JDK 17 + Android SDK 35
```

CI builds and signs it on every tag — details in [android/README.md](android/README.md).

---

[Detection ladder](docs/autodetect.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · MIT

*Local-first by architecture, not policy — the network tab stays silent.*
