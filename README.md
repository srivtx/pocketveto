<div align="center">

# pocketveto / **p-rick**

**p-rick is the research. PocketVeto is the product.**

[![Research site](https://img.shields.io/badge/research-site-8B7E5A?style=flat-square)](https://srivtx.github.io/pocketveto/)
[![CI](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml/badge.svg)](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml)
[![APK](https://github.com/srivtx/pocketveto/actions/workflows/android.yml/badge.svg)](https://github.com/srivtx/pocketveto/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-114%20passing-3ddc97?style=flat-square)](tests/)

</div>

This repository is the home of **p-rick**, an independent research program on
**user-owned computing and the economics of inattention**, and of
**PocketVeto**, the program's first product substrate — a privacy-first,
on-device autopay/subscription radar for Android.

Research comes first. Products follow the papers.

---

## The p-rick research program

We hunt for genuine gaps in the software landscape — categories with no
incubents, problems with large audiences, theories nobody has written down —
verify the gap survives adversarial review, then publish the paper that names
the category and specifies the missing system. Each paper ships with a
CEO-voice essay, because research nobody reads might as well not exist.

**🌐 Everything is on the research site: <https://srivtx.github.io/pocketveto/>**
(papers as hosted PDFs, essays, program overview)

| # | Paper | The gap | Essay |
|---|---|---|---|
| **P-001** | [The Personal Event Bus](https://srivtx.github.io/pocketveto/pdfs/p-001.pdf) | The missing OS middleware: a user-owned, append-only log of ambient digital-life events with typed, permissioned subscriptions. No product, standard, or research system combines all five elements. | [Your Phone Sees Everything and Remembers Nothing](https://srivtx.github.io/pocketveto/blog/p001.html) |
| **P-002** | [Consumer Rights as Dead Capital](https://srivtx.github.io/pocketveto/pdfs/p-002.pdf) | Tens of billions a year in consumer entitlements go unclaimed — rights issued without an execution layer. The personal entitlement engine is the missing institution. | [The Largest Pool of Unclaimed Money in the Economy Is Yours](https://srivtx.github.io/pocketveto/blog/p002.html) |
| **P-003** | [The n=1 Cost-of-Living Index](https://srivtx.github.io/pocketveto/pdfs/p-003.pdf) | No consumer software computes personal inflation that would survive statistical review. We specify the methodology the 2025–26 "personal inflation" cohort doesn't have. | [Your Inflation Is Not the CPI](https://srivtx.github.io/pocketveto/blog/p003.html) |

The three papers form one stack: **P-001** is the infrastructure layer (the
event bus), **P-002** and **P-003** are the consumer engines on top of it
(claim execution and measurement). All working papers are CC BY 4.0, red-teamed
before publication, with survey protocols and conflict-of-interest disclosures
in every appendix.

### Research directory layout

```
p-rick/
├── agents.md        # automatic work ledger — sessions, effort, lineage
├── papers/          # working papers (markdown, canonical)
├── blogs/           # one CEO-voice essay per paper (markdown)
└── site/            # GitHub Pages site (this very website)
    ├── index.html
    ├── blog/        # rendered essays
    ├── pdfs/        # typeset papers (Tectonic/LaTeX + Playwright covers)
    └── assets/
```

Work is tracked automatically in [p-rick/agents.md](p-rick/agents.md) —
sessions, durations, outputs, and lineage — so nobody has to remember how long
anything took.

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
├── p-rick/              # research program (papers, essays, site, ledger)
├── .github/workflows/   # ci.yml · android.yml · pages.yml (research site)
├── src/                 # PocketVeto web app (Next.js static export)
├── android/             # bare WebView shell (Kotlin)
├── docs/                # detection ladder, screenshots
└── tests/               # 114 tests
```

---

[Research site](https://srivtx.github.io/pocketveto/) · [Work ledger](p-rick/agents.md) · [Detection ladder](docs/autodetect.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · MIT

*Local-first by architecture, not policy — the network tab stays silent.*
