<div align="center">

# pocketveto

**PocketVeto is the product. p-rick is the research — now in its own repo: [srivtx/p-rick](https://github.com/srivtx/p-rick).**

[![Research site](https://img.shields.io/badge/research-site-8B7E5A?style=flat-square)](https://srivtx.github.io/p-rick/)
[![CI](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml/badge.svg)](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml)
[![APK](https://github.com/srivtx/pocketveto/actions/workflows/android.yml/badge.svg)](https://github.com/srivtx/pocketveto/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-114%20passing-3ddc97?style=flat-square)](tests/)

</div>

**PocketVeto** is a privacy-first, on-device autopay/subscription radar for
Android — the program's first product substrate.

Research comes first. Products follow the papers.

---

## The p-rick research program (moved)

The p-rick research program — an independent hunt for genuine
software-landscape gaps, verified adversarially, published as working
papers with CEO-voice essays — **now lives in its own repository:
[srivtx/p-rick](https://github.com/srivtx/p-rick)**, with its own site:
**<https://srivtx.github.io/p-rick/>** (dark mode + light mode).

Seven published working papers across two series — Series I
(user-owned data: the personal event bus, consumer entitlements as dead
capital, the n=1 cost-of-living index) and Series II (systems gaps:
degradation contracts, provenance-native storage, the attention
scheduler, the intermittent compute fabric) — plus essays, hosted PDFs,
and the automatic work ledger.

Work is tracked automatically in
[agents.md](https://github.com/srivtx/p-rick/blob/main/agents.md) —
sessions, durations, outputs, and lineage — so nobody has to remember
how long anything took.
---

## PocketVeto — the first product substrate

**One radar for every date your money moves.**

Trials, renewals, warranties, gift cards, 0% APR windows, passports, domains —
every money date as a blip closing in on a live radar, with a `$ at risk`
ticker and an action playbook per item. No account, no bank link, no server:
everything stays on your device.

<div align="center">
  <img src="docs/screenshots/radar.png" alt="The radar — every money date closing in" width="640" />
</div>

### Autopay detection, three ways in

- **Android app** — [download the APK](https://github.com/srivtx/pocketveto/releases/latest/download/PocketVeto-android.apk),
  flip one switch (*Notification access*): PhonePe / GPay / Paytm / bank
  payment notifications land in the Payments ledger, parsed and classified
  on-device — autopays feed the radar, one-offs stay one-offs. CI verifies
  the signature of every APK before it is published, and each release ships
  a `.sha256` sidecar — `sha256sum -c PocketVeto-android.apk.sha256` after
  downloading proves you hold the exact bytes CI signed off on.
  **v1.5.4 is a new install identity** (fresh private signing key + new
  package id): uninstall older PocketVeto first. If Play Protect blocks the
  install with no "Install anyway" option, pause *Scan apps with Play
  Protect* during the install and re-enable it after — exact steps in
  [android/README.md](android/README.md#when-play-protect-blocks-the-install-no-install-anyway).
  If your device policy blocks sideload installs outright, use the browser
  "Install app" path for the PWA instead.
- **Share** (installed PWA, Android) — share any payment notification straight in.
- **Paste** — a bank/card statement; recurring charges are found by cadence,
  amount and a local catalog of known subscription brands.

Every captured payment is filed by evidence (tracked item, mandate/EMI
wording, known brand, repeat pattern) — anything ambiguous stays a
one-off in the ledger, never a fake subscription. **Total spent**
(today / this month, split autopay vs one-off) sums it all without
touching the radar's math.

### Run it

```bash
git clone https://github.com/srivtx/pocketveto.git && cd pocketveto
bun install && bun run dev     # http://localhost:3000
bun test                       # 114 tests
```

### Build the Android APK

```bash
bun run build:static           # web export → out/
cd android && gradle assembleRelease   # JDK 17 + Android SDK 35
```

CI builds and signs it on every tag — details in [android/README.md](android/README.md).

---

## Repository layout

```
├── .github/workflows/   # ci.yml · android.yml · pages.yml (research site)
├── src/                 # PocketVeto web app (Next.js static export)
├── android/             # bare WebView shell (Kotlin)
├── docs/                # detection ladder, screenshots
└── tests/               # 114 tests
```

---

[Research site](https://srivtx.github.io/p-rick/) · [Work ledger](https://github.com/srivtx/p-rick/blob/main/agents.md) · [Detection ladder](docs/autodetect.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · MIT

*Local-first by architecture, not policy — the network tab stays silent.*
