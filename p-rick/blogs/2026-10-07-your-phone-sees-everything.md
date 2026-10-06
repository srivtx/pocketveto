---
title: "Your Phone Sees Everything and Remembers Nothing"
date: 2026-10-07
author: p-rick research program
paper: p-001-personal-event-bus
---

# Your Phone Sees Everything and Remembers Nothing

Every day, your phone receives dozens of the most valuable data points of your life — and throws them away before you've finished reading them.

The bank's notification that ₹1,199 just left your account. The e-receipt for this month's pharmacy refill. The airline's gate-change alert. The subscription that renewed itself in silence. Each one is structured, timestamped, machine-parseable evidence about your money, your health, your movements, your obligations. And the entire computing ecosystem's answer to this stream is a notification shade that scrolls and an inbox that buries.

That's not a privacy feature. That's an amnesia feature.

## The asymmetry nobody talks about

Here's the thing that should bother you more than it does. Platforms keep *exhaustive* records of you. Every ad view, every tap, every hesitation before purchase — retained, modeled, priced. Meanwhile *you* keep almost nothing of the events that actually constitute your financial life. The renewal you forgot. The price you used to pay. The refund window that closed last Tuesday.

We've spent a decade arguing about who gets to keep data. Almost no one has asked the more basic question: why doesn't the *user* get to keep any?

When we started PocketVeto, we thought we were building a subscription tracker. What we actually discovered, shipping it, is that we had built one working organ of a body that doesn't exist: a thing that *watches your payment events*. And once you've built one organ, you can't unsee the missing skeleton.

## There's a name for the missing thing

We looked for it. Hard. (The survey is in the paper — roughly eighty structured searches, and we found nothing but noise.) The missing layer has no product, no standard, no project, and not even a stable name. So we named it: the **personal event bus**.

The spec is five things, and the absence of any one of them is why nothing today does the job:

1. It **captures** ambient events — notifications, e-receipts, statements — through adapters.
2. It **keeps** them — an append-only, encrypted log on your device.
3. It **normalizes** them — events typed by an open schema, not raw text.
4. It **serves** them — local apps subscribe, with per-field permissions you can revoke.
5. You **own** it — no account, no cloud, no telemetry. The network tab stays silent.

Everything adjacent exists and stops short. Solid pods store documents but capture nothing. IFTTT routes triggers through someone else's server and forgets them. Notification loggers capture everything as raw text and normalize nothing. Home Assistant built a genuinely great local event bus — for your light bulbs, not your life. Microsoft's MyLifeBits proved a decade of durable personal capture in research — without schemas, subscriptions, or a permission model. Every player is in a corner of the design space. The center is empty.

## Why the empty center is not an accident

The history here is a graveyard, and reading it correctly matters. Databox, HAT, digi.me — serious efforts, dead or pivoted. The lesson everyone took was "personal data infrastructure doesn't work." The lesson we take is narrower and more useful: **substrates that ship before their consumers starve.** Middleware is never procured in advance. It gets retrofitted onto a killer app that would exist anyway.

That's exactly what PocketVeto is: the proof that the pattern works, vertical-slice edition. Our payment-notification capture is one bus adapter. Our ledger is one consumer. The plan isn't to launch an abstract platform and pray — it's to extract the bus from an app that already earns its keep, then let the second schema pack (e-receipts) and the second consumer turn an engine into infrastructure.

## The window is closing

Here's the uncomfortable part. Apple Intelligence and Google's Gemini stack are *already* the semantic layer over your notifications — closed, ephemeral, first-party-only, non-interoperable. They summarize, they don't remember; they serve the vendor, not you; and they will never let a third-party app subscribe to your events with a permission sheet.

The open window is exactly as wide as the distance between "the OS does a closed version of this" and "the OS absorbs the category." We'd rather publish the open spec while the second fact is still deniable.

## What we're doing

The full specification is in our first research paper — [The Personal Event Bus: User-Owned Middleware for Ambient Digital-Life Events](../papers/p-001-personal-event-bus.md) — including the formal event model, the permission calculus, the threat model (we wrote the hostile-parser section honestly: sandboxed, no network, auditable output, and we name the residual risks instead of pretending they're zero), and the adoption mechanics.

Three commitments worth stating in public:

- **The bus has no product surface of its own.** Permission sheet, event inspector, log, export. Everything else is a consumer. The moment we bolt a dashboard onto it, we've become another app, and the category dies with us.
- **The schemas are a commons.** Schema packs should be maintained like blocklists — community artifacts, signed, versioned. Nobody trusts a personal-data runtime whose grammar is a private API.
- **We disclose our position.** We built PocketVeto; the bus is designed to be extractable from it. That's a conflict of interest, it's in the paper, and you should weigh our claims accordingly.

One regulation note, because it's the sleeper argument: GDPR's portability right (Article 20) covers data you *provided* — and the events that matter most are pushed to you by counterparties, in a doctrinal gray zone. Someday a regulator will require banks and merchants to emit machine-readable event streams to an endpoint you designate. When that day comes, there is exactly one architecture on the table that can receive them without becoming a cloud honeypot. It's this one.

## The one-sentence version

Your digital life emits a stream of consequential, parseable events; today that stream dies on contact with your lock screen; we wrote the specification for the layer that would remember it — for you, under your terms, in a form your software can use.

The paper is the long argument. The bus is the next decade of local-first software trying to happen. We intend to be early on purpose.
