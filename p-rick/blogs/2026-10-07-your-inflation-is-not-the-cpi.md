---
title: "Your Inflation Is Not the CPI. It's Time You Could Measure Yours."
date: 2026-10-07
author: p-rick research program
paper: p-003-n1-cost-of-living-index
---

# Your Inflation Is Not the CPI. It's Time You Could Measure Yours.

Economics has known for a decade that your inflation isn't the headline number. Kaplan and Schulhofer-Wohl built household-specific price indices and found dispersion that is large and persistent. Jaravel showed inflation differs systematically across the income distribution — the common-goods basket of lower-income households inflates faster. Argente and Lee found the same inequality through the recession, attenuated only for households agile enough to switch where they shop.

Your basket, your city, your store, your timing. Compounded over a decade, a 1–3 point personal-vs-headline gap is a 10–35% difference in experienced cost of living. That's not a rounding error. That's the difference between a raise that keeps up and one that quietly doesn't.

And your only tools for seeing it are vibes.

## The calculators personalize the wrong half

When inflation became political in 2021–2023, every statistical agency shipped a "personal inflation calculator." The ONS one, StatCan's, the rest — they all do the same thing: you type your category spending shares, they re-weight *official aggregate* category indices. Your weights, their prices.

That has a hard ceiling. The shelf price of *your* oat milk at *your* store can rise 40% while the "dairy alternatives" category index rises 6% — and no calculator on earth will show you that, because no calculator has your prices. Meanwhile the receipt-scanning industry has OCR'd your receipts at industrial scale for a decade — Fetch alone reports billions processed — and monetized every byte as brand market research. Your price history exists. It's just sold to manufacturers instead of shown to you.

## A cohort is forming — and shipping mood rings

2025–26 brought the first apps claiming "your personal inflation index." We verified them directly: grocery-only, single-channel (manual receipt snaps), effectively zero ratings — and, critically, *methodology-free*. Their month-over-month "inflation" is mostly what happens when you divide this month's spending by last month's. That's a spending-growth rate wearing an inflation costume. If you bought more, their index rises. That is not a statistic; it's a sentiment with a decimal point.

The gap isn't an app gap. It's a *methodology* gap. Computing a price index at n=1 — one household, sparse purchases, noisy OCR, changing package sizes — is genuinely hard statistics, and nobody had done the work. So we did. That's our third paper.

## The hard problems, and the answers

**Spending isn't prices.** The construction only measures prices of *matched* items — the same product entity observed in two periods. What you bought more of never enters.

**Sparse data lies.** With 3 matched items, an index is noise. So the method has publication rules: minimum matched-item counts, coverage statistics, and — the feature we're proudest of — it *refuses to publish* when your data doesn't support a number, and tells you how many more observations it needs. A statistic that knows when to stay silent.

**Shrinkflation is a matching problem, not an alert feature.** Here's the subtle bit everyone gets wrong: if package size is baked into product identity, the 500g→400g transition silently drops out of your matched set as "item churn" — the shrinkflation vanishes from the index. Our fix is a two-level entity model: size-invariant product entities for matching, package variants as attributes compared through unit prices. A smaller box at the same shelf price surfaces as exactly what it is — a price increase. And when a size change goes *undetected* (the receipt doesn't print it), the method widens its error bars instead of pretending it saw.

**Cold start.** Month one, you have no history. The method shrinks each category toward the official index as a *prior*, with the official influence an explicit, decaying function of your own data volume — and a published "personal share" statistic so you always know how much of your number is you versus the prior.

**Honesty about what it is.** It's a fixed-basket measure of your realized price experience — not a welfare measure. When you substitute away from expensive items, the index measures the price of continuing to buy what you bought. The error bars and coverage statistics carry that limit. And rent — the largest category for most households — enters as a canonical item with unit "dwelling-month," with moves excluded rather than fake-compared.

The paper includes a worked example where the pipeline's most distinctive behavior is refusing to overclaim in exactly the month a naive app would print a confident "+13%."

## Why this is a methodology and not a product

Because methodology is the moat *and* the public good. We published the construction, the validation protocol (semi-synthetic replays against the closest-to-open price panels; interval-coverage tests; shrinkflation injection), and we're building the reference implementation as a library. The consumer app on top is almost trivial once the method exists — and it runs local-first, on-device, on the event ingestion layer from our P-001. No cloud, no account. Your price history is the one dataset that should obviously never leave your device.

The 2025–26 cohort is demand evidence, not competition. They prove people want this number. We're making the number *true*.

## The vision, stated once

Every receipt you've ever generated is a price observation for the basket that actually matters — yours. Right now that data is sold to brands and never shown to you. The n=1 cost-of-living index turns it into the one statistic no one will sell you back: your inflation, with error bars.

The full methodology — the five failure modes, the two-level canon, the shrinkage estimator, the validation harness, the worked example, the honest limitations — is in our third paper: [The n=1 Cost-of-Living Index: Statistically Defensible Personal Inflation from Local-First Purchase Streams](../papers/p-003-n1-cost-of-living-index.md).

Headline CPI answers the question "what happened to the average household?" — which is a question for central bankers. Your index answers the question you actually have: *what happened to me?* For the first time, that question has a methodology. It deserves an instrument.
