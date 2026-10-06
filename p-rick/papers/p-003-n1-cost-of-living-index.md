---
id: p-rick/P-003
title: "The n=1 Cost-of-Living Index: Statistically Defensible Personal Inflation from Local-First Purchase Streams"
author: p-rick research program
date: 2026-10-07
status: v1.0 (working paper)
license: CC BY 4.0
---

# The n=1 Cost-of-Living Index: Statistically Defensible Personal Inflation from Local-First Purchase Streams

## Abstract

Every household's inflation differs from the headline CPI — sometimes by several points per year — because baskets, local prices, and timing diverge; the empirical-economics literature has documented this dispersion at the household-group level since at least Kaplan & Schulhofer-Wohl (2017), and attributes much of it to income (Jaravel 2019; Argente & Lee 2021). Yet no consumer software computes a personal price index that would survive statistical review: a 2025–26 cohort of micro-apps now claims to ("your personal inflation index"), but ships grocery-only, single-channel, methodology-free averages that conflate spending drift with price change. The missing artifact is not another app but a *methodology*: a statistically defensible way to compute a price index at n=1 from sparse, noisy, heterogeneous personal purchase records. We formalize the n=1 estimation problem — unit-value bias, sparse matching, chain drift, quality change (shrinkflation), and small-sample uncertainty — and give a construction that addresses each: unit-normalized item canonization; matched-model elementary indices with minimum-overlap publication rules; chained aggregation with drift control; shrinkflation handled as explicit quality adjustment rather than novelty alerting; hierarchical Bayesian shrinkage of cold-start categories toward official category indices; and interval-valued publication with a coverage standard ("no index without n≥k matched items"). We specify the local-first system that ingests photo receipts, e-receipts, and bank records on-device (the personal event bus of P-001 as ingestion), and an open validation protocol: replaying a synthetic household against public scanner-style price panels and replicating documented household dispersion. The result is the missing statistic — *your* inflation, with honest error bars — as an open methodology and reference implementation rather than a proprietary black box.

**Keywords:** personal inflation, price index, matched model, chain drift, shrinkflation, local-first, Bayesian shrinkage

---

## 1. Introduction

The CPI is an average over a population that contains you only in aggregate. Its basket is constructed from consumer expenditure surveys that describe a median household which may not exist; its prices are sampled from outlets you may not shop; its quality adjustments encode decisions about products you may not buy. The macro literature treats this as measurement background noise. For a household, it is not noise: Kaplan & Schulhofer-Wohl (2017) construct household-specific indices for the US and find inflation dispersion across households is *large and persistent*, driven by basket composition and shopping timing. Jaravel (2019) shows inflation systematically differs *across the income distribution* — lower-income households face higher inflation for common goods. Argente & Lee (2021) find the same inequality during the Great Recession, with shopping-channel substitution attenuating it for some households. During the 2021–2023 inflation surge, the gap between aggregate CPI and experienced cost-of-living became a political fact, and every statistical agency deployed a stopgap: the UK ONS, StatCan, and others shipped "personal inflation calculators" — one-shot questionnaires that re-weight *official aggregate* category indices by your category spending shares.

That family of calculators has a structural ceiling: it personalizes **weights**, not **prices**. Your actual basket prices — the shelf price of your specific oat milk at your specific store, rising 40% while the "dairy alternatives" category index rises 6% (an illustrative pair, not a measured one) — never enter. The calculators cannot see your prices because no consumer software *has* your prices. The receipt-scanning industry (Fetch, Receipt Hog, Rakuten) has OCR'd receipts at industrial scale — Fetch alone reports billions processed [fetch.com] — and monetized them as brand market research; the price history is sold to manufacturers, never returned to the shopper who generated it. Personal-finance apps run on bank-transaction feeds (Plaid/MX) that are structurally price-blind: a transaction knows an amount and a merchant, never a unit or a product.

Meanwhile, the enabling technologies quietly matured: on-device OCR is commodity; small language models parse messy receipt line items into structured records on a phone; and longitudinal event capture on personal devices is proven (P-001; PocketVeto for payment notifications). In 2025–26 the first micro-apps attacked the gap — Inflata ("your personal inflation index… based specifically on the items you buy… month-over-month," with price-per-unit shrinkflation alerts; Aisle (local-first on-device receipt OCR, "personal price increases over time, by category") — confirming demand, and confirming the vacuum: grocery-only, manual single-channel input, no index methodology, no validation, and effectively zero adoption (0 App Store ratings each at survey time).

This paper's position: the invention missing here is not an app but **the n=1 methodology** — the statistical discipline that makes "your inflation" a defensible number rather than a sentiment — plus the local-first system design that computes it without shipping the underlying purchase stream to anyone. We contribute:

1. **A formal statement of the n=1 index problem** and its five failure modes (Section 4).
2. **A construction** — matched-model, chain-controlled, quality-adjusted, shrinkage-stabilized, interval-published — that survives those failure modes (Section 5).
3. **A local-first system architecture** with provenance-first ingestion (Section 6).
4. **A validation protocol** for personal index methods against public panels and documented dispersion (Section 7).
5. **A critique of the 2025–26 cohort** that isolates exactly which failure modes they currently embody (Section 8).

---

## 2. Why personal indices matter, and why now

Three arguments, in increasing strength:

**The measurement argument.** Aggregate CPI is a sufficient statistic for monetary policy, not for household decisions. A retiree's basket (healthcare, utilities, food) and a young urban renter's (rent, transport, dining) co-move with headline CPI only loosely. When the dispersion is 1–3 points (the empirical range in the household literature), over a decade of compounding the difference in experienced cost-of-living is 10–35% — large enough to matter for wage negotiation, budgeting, retirement planning, and geographic decisions. Households currently navigate this blind, with folklore ("inflation feels way higher than the official number") standing in for measurement.

**The accountability argument.** Shrinkflation and quality degradation are the dark matter of personal inflation: unit sizes fall, formulations change, "premium" tiers replace standard SKUs — captured imperfectly in official quality adjustment (UNECE's scanner-data downsizing detection is the state of the institutional art), and invisible in personal experience until the shopper happens to notice. A personal index with item-level provenance makes each consumer's quality changes *visible and attributable*, turning "I feel like I'm paying more for less" into a decomposable fact.

**The timing argument (why now).** The ingestion layer is newly feasible (on-device OCR + LLM parsing + event capture — P-001); the demand is demonstrated (the 2025–26 cohort, official-agency calculators, press coverage teaching manual personal-inflation arithmetic); the incumbents are structurally disincentivized (receipt-data monetization for brands; PFMs' price-blind rails; agencies' mandate is aggregate). And the window is closing: a funded entrant or an OS-level receipt intelligence could occupy the category with a proprietary methodology. An open, validated methodology published now is the difference between a commodity statistic and a closed one.

---

## 3. Related work

**Index theory.** The price-index canon — Laspeyres, Paasche, Fisher, Törnqvist superlatives; the Dutot (ratio of average prices), Carli (average of ratios), and Jevons (geometric mean) elementary formulas; the unit-value index critique (unit values mix quantity and quality changes; see the scanner-data literature, Feenstra & Shapiro's NBER volume) — was developed for statistical agencies with sample designs, not for single households with organic data. Its assumptions break under n=1 in specific, catalogable ways (Section 4).

**Scanner-data methods.** Retailer scanner data drove the modern elementary-index practice: matched-model indices over scanner barcodes, with explicit treatment of entering/exiting items and chain drift (chained monthly indices accumulate "drift" when item sets churn; BLS research documents chained CPI-U drift magnitudes; multilateral methods — GEKS, time-product dummy — exist precisely to control it). Personal purchase streams are *scanner data with n=1 store, n=1 shopper, and extreme sparsity* — the same problems, harsher.

**Household-level indices.** Kaplan & Schulhofer-Wohl (2017) is the direct methodological precedent: household-specific inflation indices from Nielsen consumer-panel data, with documented dispersion. Jaravel (2019), Argente & Lee (2021), and subsequent work (Prati 2024 on well-being costs) establish the economics. All are *ex post research constructions over panel data*; none operationalizes the method for a live consumer, and none confronts the cold-start/sparse-stream regime a live product faces.

**Shrinkflation and quality adjustment.** Official practice treats size changes as quality adjustments (hedonic or direct size normalization); UNECE documents automated downsizing detection from scanner data. Consumer-facing detection (unit-price databases, press experiments) is episodic. The 2025–26 cohort's "shrinkflation alerts" rebrand it as a feature; index-correct treatment is rarer.

**Personal-inflation calculators.** ONS (UK, HCI-derived), StatCan, Destatis, and others: category-share re-weighting of aggregate indices, one-shot, no user prices, no tracking. The ceiling is structural, as noted: personalized weights, official prices.

**Receipt data economics.** Fetch, Receipt Hog, and the B2B layer (e.g., Veryfi, brand-analytics products) prove the capture pipeline exists at scale — monetized for brands, not users. The gap between what receipt apps know and what users are told is itself a datum about incentive structures.

**Local-first systems.** Kleppmann et al. (2019) for the architectural discipline; P-001 (this program) for the event-ingestion layer; Aisle (2026) as an existence proof that local-first receipt OCR is shippable.

---

## 4. The n=1 measurement problem, formally

Let the personal purchase stream deliver observations `(item, t, price, quantity, size, channel)`. The target is a personal cost-of-living index: the minimum-expenditure ratio for a *fixed level of living* between periods (the Konüs/true cost-of-living concept), which practical indices approximate.

Five failure modes make n=1 brutal:

**F1 — Unit-value bias.** The only index a naive computation can form is the ratio of average spending per period (or per item), but unit values conflate price change, quantity mix, package-size mix, and channel mix. The cohort's month-over-month "personal inflation" is largely this: a spending-growth rate wearing an inflation costume. The identity: `spend = Σ priceᵢ·qᵢ`; only the `priceᵢ` term is inflation.

**F2 — Sparse matching.** An agency matches hundreds of thousands of items monthly; a household buys a given SKU perhaps monthly (groceries) or yearly (durables). Elementary indices over matched items require overlap: the set of items *bought in both* of two consecutive months may be small, selection-biased (you bought it because it was on promotion), and category-skewed (matched items are over-represented in routine categories).

**F3 — Chain drift.** Chaining month-over-month matched indices compounds F2's selection: the chain reflects a path through changing item sets that can drift systematically (documented for chained CPI-U; worse at n=1). Alternatively, direct fixed-base indices go stale as the base basket recedes from relevance.

**F4 — Quality change, especially shrinkflation.** The same shelf price on a 400g package that was 500g is a 25% price increase, not price stability — but only if the size transition is *observed and normalized*. Unobserved formulation changes (fiber-to-sugar swaps) are quality change the stream cannot see at all; the index must carry that as irreducible uncertainty, not fake precision.

**F5 — Small-sample uncertainty.** With n matched items, an elementary-index estimate has sampling variance ∝ 1/n (plus heterogeneity variance). A personal category index built on 4 observations is noise. Publishing a point estimate without an interval is indefensible; the honest personal index is *frequently an interval containing the official category index*, and the methodology must be willing to say so.

The problem statement: construct an estimator of the personal cost-of-living change between t and t+1 from the household's own stream, that (i) is approximately unbiased for price change conditional on a fixed basket (not spending) under ignorable purchase timing — promotion-driven selection biases matched sets, and the direction is downward, which we disclose rather than pretend away — (ii) controls drift, (iii) explicitly adjusts or expands uncertainty for quality change, (iv) remains defined under sparse data by principled fallback, and (v) publishes with calibrated uncertainty. That estimator is the paper's contribution.

---

## 5. The construction

### 5.0 Pipeline overview

```
stream → (1) canonization → (2) unit normalization → (3) matching →
(4) elementary indices → (5) aggregation with drift control →
(6) quality adjustment → (7) shrinkage → (8) publication with intervals
```

### 5.1 Item canonization: a two-level entity model

Receipt line items are unstructured ("OATLY BARISTA 1L", "OAT MLK BARISTA"). Canonization is two-level:

- **Product entity** — the size-invariant good ("Oatly Barista oat milk"), resolved from a normalized description + brand key (and GTIN family where present). This is the matching unit.
- **Package variant** — a concrete size/packaging of the product (1L, 2×1L, 400g…), an attribute of observations. A GTIN resolves to exactly one variant; every variant maps up to exactly one product entity.

The two-level structure is what makes shrinkflation *matchable*: a 500g→400g transition is a variant change on the *same* product entity, so the observation stream stays matched at the product level while the unit-price comparison (5.2) carries the quality change — instead of the transition silently dropping out of the matched set as "item churn," which is what happens in any scheme where size is baked into identity. Canonical entities are *versioned*: a merge or split is a metadata event, never a silent data change. Provenance: every observation retains a pointer to its raw artifact (photo crop, e-receipt node — the P-001 provenance store), so re-parsing can rebuild the canon without losing history.

### 5.2 Unit normalization

All prices normalized to unit prices (per 100g, per liter, per count) *within the product entity's variant set*. Because variants roll up to the product, a 500g→400g transition on the same product is a *variant-transition record* with dates and both unit prices — first-class data feeding the quality-adjustment step (5.6), not a matching break.

### 5.3 Matching

For each pair of consecutive periods (t, t+1): the matched set `M(t)` = **product entities** observed in both. Publication rules: a category-level elementary index requires `|M_c| ≥ k` (reference: k=3) and coverage `Σ_matched spend / Σ_total category spend ≥ γ` (reference: γ=0.5, with a reported coverage statistic — under-coverage categories fall to 5.7 fallback). Matching is exact at the product-entity level, with no price-bounded "same item" fudging (promotion-driven selection is disclosed via the coverage statistic, not hidden).

### 5.4 Elementary indices

Over the matched set, per category c — where `p_i(t)` is the unit price of product entity `i` in period `t` and `q_i(t)` the quantity (in canonical units) purchased:

```
I_c(t+1) = [ Π_{i∈M_c} (p_i(t+1)/q_i(t+1)) / (p_i(t)/q_i(t)) ]^(1/|M_c|)   (Jevons over unit prices)
```

When a product is purchased multiple times within a period, its period price is the quantity-weighted mean of its unit prices (a controlled, disclosed reintroduction of the unit-value idea at the sub-monthly level — the alternative, last-observation, introduces recency bias; the choice is reported as a method flag and the validation harness of Section 7 measures its effect).

The Dutot alternative (ratio of mean unit prices) is reported as a robustness check. The Jevons form limits single-item leverage (one promotion cannot dominate a category) and is the international standard for elementary aggregation.

### 5.5 Aggregation with drift control

Category indices aggregate to the personal index with Törnqvist-style weights (average expenditure shares of the two periods) over categories *with published indices*; categories below the publication threshold fall back (5.7). Two control mechanisms against F3: (a) *rolling-window direct indices* — the headline index is direct over a 12-month rolling base (limiting chain length), with a chained monthly variant reported as the "momentum" view; (b) *drift audit* — the cumulative divergence between the chained and direct series is a monitored statistic; divergence beyond a bound triggers re-basing and flags the drift to the user as a data-quality event, not silently absorbed.

### 5.6 Quality adjustment (shrinkflation and size)

Quality adjustment operates at the variant boundary. When consecutive observations of a matched product entity resolve to different package variants, the elementary index compares them **through unit prices**: a pure size change (same product, smaller package, same shelf price) therefore surfaces as the unit-price increase it economically is. This is a deliberate, *explicit* adjustment step — variant transition detected → unit-price comparison across variants — not a silent byproduct; when the transition is *undetected* (size not printed on the receipt, OCR missed it), the event falls to the uncertainty term below. What is never observable — formulation changes, channel mix — is carried as an explicit quality-change uncertainty term: the interval widens by an estimated quality-change variance (calibrated by category from public panel data on item-churn rates). The principle: quality change you can observe, adjust; quality change you cannot observe, pay for in honest uncertainty.

### 5.7 Shrinkage: the cold-start fallback

Category-level personal indices with sparse data shrink toward the official category index (the only high-quality prior available):

```
Î_c = (n_c · x̄_c + κ_c · I_c^official) / (n_c + κ_c)
```

with `n_c` the matched-item count, `κ_c` a category-level shrinkage strength (calibrated so that κ→0 influence requires n≈10+ matched items, roughly the point where personal estimates stabilize in panel-data experience). This is the hierarchical-Bayes flavor of the ONS calculators *done right*: the official index is a prior, not a substitute, and its influence is an explicit, decaying function of your own data volume. A "personal share" statistic (`n/(n+κ)` per category, and overall) is published with the index: you always know how much of *your* number is *you*.

### 5.8 Housing: the largest category, treated honestly

Rent is the dominant expenditure for a large share of households and is fully observable in bank feeds. The construction treats the dwelling as a canonical item with unit = *dwelling-month*: the monthly rent observation is a price observation; a lease renewal is a price change; a move is an item exit with a new item entry (housing's quality change is location — not comparable across dwellings — so moves are excluded from matching and surface in the coverage statistic). Owner-occupied housing (rent-equivalent estimation, repairs, property tax) is ingested where observable and matched only within itself. Housing thus enters the index for the (large) population with stable tenure — and honestly refuses to for movers, rather than fabricating comparability.

### 5.9 Publication with uncertainty

Elementary-index uncertainty via nonparametric bootstrap over matched items; posterior intervals from the shrinkage model; a total interval combining sampling, quality-change, and OCR-error variance components (the last calibrated from validation replays, Section 7). Publication criteria: the headline index is emitted as {point, 90% interval, personal share, coverage}; below global coverage thresholds, the product says "not yet measurable — N more observations of category X needed," which is the feature that separates a statistic from a sentiment.

### 5.10 What the index is *not*

It is not spending growth (F1 is excluded by construction). It is not a forecast. It is not a replacement for official statistics (it borrows them as priors). It is a fixed-basket approximation to the Konüs cost-of-living concept, measured over your realized purchases: substitution behavior (switching away from items whose prices jump) exits the matched set, so the index measures the price of *continuing to buy what you bought* — an experience measure, not a welfare measure, and the coverage and uncertainty statistics carry that limit rather than hiding it.

### 5.11 A worked example

One household, two months, three categories. Basket: oat milk (bought monthly), pasta (bought monthly), coffee (bought every other month).

- **March:** oat milk 1L @ 199 (unit 199/L); pasta 500g @ 89 (unit 17.8/100g); coffee not bought.
- **April:** oat milk **2×1L @ 478** (variant change; unit 239/L); pasta 500g @ 95 (unit 19.0/100g); coffee 250g @ 349 (absent in March → not matched; hits coverage).

Pipeline behavior:

1. **Canonization:** both oat-milk observations resolve to the same product entity; the 2×1L is a variant attribute, not a different item.
2. **Matching:** M = {oat milk, pasta} at product level. Coffee is unmatched → category "coffee" has n=0 → below k=3 → shrinkage path (5.7) with the official prior.
3. **Quality adjustment:** oat milk's variant transition is detected → compared through unit prices: 199 → 239 (+20.1%). The pack-size change is absorbed; there is no "different item" excuse. Pasta: same variant, 17.8 → 19.0 (+6.7%).
4. **Elementary index (Jevons over matched):** (1.201 × 1.067)^(1/2) = 1.132 → **+13.2%** month-over-month.
5. **Publication discipline:** n=2 matched items → the bootstrap interval is wide; coverage discloses that coffee's unmatched spend share was 34%; the personal share is low. The published statement is: "+13.2% [wide interval at n=2], personal share low, coverage 66% — more months of data required for a publishable grocery index."

The example's point: the methodology's most distinctive behavior is *refusing to overclaim* in exactly the month a naive app would have printed a confident "+13%."

---

## 6. System design: local-first, provenance-first

Architecture (deliberately P-001-compatible):

1. **Ingestion adapters:** photo-receipt capture (on-device OCR + small-model parsing), e-receipt ingestion (IMAP, the highest-coverage channel), bank-CSV import (categories without items — usable for weight construction, not elementary indices), and the notification-event bus (P-001) for purchase events with counterparty and amount.
2. **Canon store:** local, versioned, with the provenance blob store for raw artifacts (re-parseable history — the same discipline as P-001's raw store).
3. **Index engine:** the Section-5 pipeline as a pure function over the canon store; deterministic and re-runnable (the index for a period is recomputable from the store, supporting audit and method upgrades without data loss).
4. **Surfaces:** the index (point, interval, personal share), category decomposition ("your dairy index vs the official one"), shrinkflation ledger (size-transition events with dates and unit-price impacts), and a price-history view per canonical item ("your oat milk: ₹199/L in March, ₹289/L now").

No cloud component; no account; export as the interoperability escape hatch. The threat model inherits P-001: hostile parsers sandboxed; the canon store encrypted at rest; the *output* (the index) is shareable by choice (a household's inflation experience is exactly the datum wage negotiators and journalists could use — an export feature, not a telemetry channel).

---

## 7. Validation protocol

A methodology claiming statistical respectability must submit to tests:

1. **Replay against panels.** Construct synthetic households by sampling basket compositions and shopping patterns from public consumer-panel style distributions; replay their purchases against public price panels. We are explicit about data reality: no open *household-level* scanner panel with both prices and purchases exists (the US CPI research database and the Kilts panel are restricted). The candidates are the closest-to-open sets that do — the Dominick's project data (store-level scanner), PriceStats/Billion Prices Project series (online prices), Numbeo (crowdsourced city prices) — plus ONS/StatCan open category series as priors. Consequently **semi-synthetic replay is the primary validation path, not a fallback**: households are simulated from public expenditure distributions and replayed over those price panels. Measure: bias of the n=1 estimator vs the panel's "true" household index; interval coverage (do 90% intervals cover 90%?); the personal-share trajectory (how fast does an organic stream become informative?).
2. **Dispersion replication.** The construction, applied across synthetic households, should reproduce the *documented* empirical dispersion (Kaplan-Schulhofer-Wohl-style). Failure to reproduce dispersion would itself be diagnostic (over-shrinkage).
3. **Drift audit.** Compare chained vs rolling-direct series over long simulated streams; verify drift-control triggers.
4. **Shrinkflation injection.** Inject size transitions with known true price effects; verify the construction recovers the injected values and the interval widens appropriately when transitions are hidden.
5. **Live pilot.** The reference implementation on real volunteer streams, reporting coverage statistics and the empirical distribution of personal-vs-official divergence. (The pilot's pre-registration: the headline claim we expect to verify is not "inflation is higher than reported" but "personal divergence is large and persistent" — either direction.)

This protocol is published as part of the methodology: an open validation harness a third party can run against any implementation — the difference between a method and a marketing claim.

---

## 8. The 2025–26 cohort, critiqued

Against Section 4's failure modes:

| Failure mode | Inflata / Aisle class | This methodology |
|---|---|---|
| F1 unit-value bias | Present (spending/month-over-month averages; Aisle's "price increases by category" is category spending drift unless matched-model) | Excluded by construction |
| F2 sparse matching | Unaddressed (no publication rules) | k-matching + coverage stats |
| F3 chain drift | Unaddressed | Rolling direct + drift audit |
| F4 quality change | "Shrinkflation alerts" as novelty features (Inflata) — detection without index treatment | Unit normalization by construction + uncertainty widening |
| F5 uncertainty | Point estimates, no intervals, no personal-share disclosure | Interval + personal share |

The critique is not that the cohort is wrong to exist — they are demand evidence, and Aisle's local-first stack is the right architecture. It is that they ship *sentiment machinery*: numbers that feel like inflation, move when spending moves, and carry no calibration. The methodology layer is the actual invention, and it is open.

---

## 9. Limitations

1. **The irreducible ceiling.** Some quality change is unobservable (formulation); some categories never accumulate n (durable goods); the honest index will *often* be an interval dominated by official priors. The methodology's value is that it knows when it doesn't know.
2. **Ingestion fatigue.** Manual receipt capture dies from friction; the e-receipt and event-bus channels are the load-bearing ones (P-001 dependency; iOS constraints as in P-001).
3. **Canonization is hard.** Canonical entity resolution on messy OCR is the engineering frontier; errors are silent unless audited. The provenance store + re-parsability is the mitigation, and validation replays (Section 7) quantify the OCR-variance component.
4. **Panel access for validation.** Public scanner-style data is uneven; the protocol degrades to semi-synthetic validation where panels are closed.
5. **Adversarial retail.** Dynamic/personalized pricing (digital shelf prices) means "your price" and "the price" can legitimately diverge; the index measures your realized experience — this is a feature, but comparisons to official statistics need the caveat.

---

## 10. Roadmap

1. **M1:** methodology specification package (this paper) + open reference implementation of the pipeline as a library.
2. **M2:** validation harness with semi-synthetic replays; publish bias/coverage results as the method's certificate.
3. **M3:** consumer surface (local-first app) over the P-001 ingestion stack — the "your inflation, with error bars" product.
4. **M4:** shrinkflation ledger as a standalone public good (size-transition events are the consumer-legible face of the methodology).
5. **Research program:** the first *instrumented* measurement of personal-vs-official divergence across a real population — the statistic the household-inflation literature has wanted since Kaplan & Schulhofer-Wohl and could never collect, because the collection instrument is the system this paper specifies.

---

## 11. Conclusion

"Your inflation is different from the CPI" has been an empirical finding of economics for a decade, a political fact for five years, and a software category for about one. What the category lacks is the one thing that makes a number a statistic rather than a mood: a methodology that survives its own sparsity. This paper has specified that methodology — matched where it can match, shrunk where it must, adjusted where it observes quality change, uncertain where it cannot see, and silent where it has no right to speak. Built on the ingestion layer of P-001 and sharing its local-first discipline, it turns the receipt stream that brands already monetize into the one statistic they never sell back: the price of your life, honestly measured — with its error bars.

---

## Appendix A — Survey method

Landscape claims (the calculator family, the receipt-data economy, the 2025–26 cohort) derive from structured web searches conducted 6–7 October 2026 via a commercial search API: ~110 queries across {"personal inflation calculator", "personal inflation tracker app", "receipt scanning app price history", "shrinkflation tracker app", "personal CPI", plus per-app verification via the iTunes Search/Lookup API}, English-language, first 10 results per query; inclusion = the tool claims to compute personal inflation or track personal prices; exclusion = aggregate CPI dashboards and budget-only trackers. The 2025–26 cohort's App Store entries were verified directly (release dates, seller, ratings at survey time). Raw result JSONs are retained in the program's research archive.

## Disclosure

The p-rick program is developed alongside PocketVeto (this repository), whose payment-notification capture is proposed as one ingestion adapter for the system specified here. The program's interest in the category's existence is therefore not disinterested; readers should weigh the positioning accordingly.

---

## References

- Kaplan, G., & Schulhofer-Wohl, S. (2017). Inflation at the household level. *Journal of Monetary Economics*, 91, 19–38. — the direct precedent.
- Jaravel, X. (2019). The unequal gains from product innovations: evidence from the U.S. retail sector. *Quarterly Journal of Economics*, 134(2), 715–783.
- Argente, D., & Lee, M. (2021). Cost of living inequality during the Great Recession. *Journal of the European Economic Association*, 19(2).
- Feenstra, R. C., & Shapiro, M. D. (eds.) (2001). *Scanner Data and Price Indexes*. NBER Studies in Income and Wealth, Vol. 64. University of Chicago Press. — unit-value critique; matched-model practice.
- Prati, F. (2024). The well-being cost of inflation inequalities. ideas.repec.org.
- ILO/IMF/OECD/UNECE/World Bank. *Consumer Price Index Manual* (2020). — elementary formulas, Jevons/Dutot standards.
- UNECE. Automatic downsizing and upsizing detection in scanner data. unece.org. — institutional shrinkflation treatment.
- Chained CPI-U research literature — chain drift magnitudes and multilateral controls (GEKS).
- Kleppmann, M., et al. (2019). Local-First Software. Ink & Switch.
- ONS personal inflation calculator (HCI-derived); StatCan personal inflation calculator; Destatis; Heritage Foundation calculator — the weight-personalization family.
- Fetch / Receipt Hog / Veryfi — receipt-data monetization model (receipts→brands, not users).
- Inflata (App Store, released 2026-07); Aisle (App Store, id 6774123890, released 2026-06) — the 2025–26 cohort.
- p-rick P-001 (this program). The Personal Event Bus. — ingestion layer.
- PocketVeto (2025–2026). On-device payment event capture. github.com/srivtx/pocketveto.
