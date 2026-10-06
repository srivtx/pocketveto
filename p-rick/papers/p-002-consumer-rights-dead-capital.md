---
id: p-rick/P-002
title: "Consumer Rights as Dead Capital: The Case for a Personal Entitlement Engine"
author: p-rick research program
date: 2026-10-07
status: v1.0 (working paper)
license: CC BY 4.0
---

# Consumer Rights as Dead Capital: The Case for a Personal Entitlement Engine

## Abstract

Modern economies grant individuals an enormous flow of statutory and contractual entitlements — flight-delay compensation, chargeback rights, refund windows, price guarantees, warranty coverage, class-action claims, escheated funds — and individuals exercise almost none of them. By our tally of domain estimates, the annually unexercised value runs to **tens of billions of dollars per year in the US and EU alone**: industry estimates put EU261 airline compensation unclaimed at €3–6 billion per year (87% of eligible passengers never file — figures sourced largely to the claims industry, and carrying corresponding conflict-of-interest risk); class-action claims-made response rates sit at or below 10%; roughly $3 billion in gift-card value is forfeited annually; and a ~$70 billion escheatment *stock* accumulates against ~$4.5 billion in annual returns. Borrowing Hernando de Soto's term, we call these **dead capital**: assets that exist on paper, backed by law, but cannot be *executed* by their owners because no infrastructure exists to convert a legal right into a filed claim at near-zero marginal cost. We formalize the claim-execution decision, show that the binding constraint that software can structurally remove is per-claim friction — the administrative-burden triplet of learning, compliance, and psychological costs — and specify the missing software category: a **personal entitlement engine** that ingests personal events (from the personal event bus of P-001), matches them against a versioned machine-readable corpus of consumer-rights rules, maintains a deadline-bearing ledger of claimable entitlements, and files and escalates claims as the user's authorized agent. We analyze five case histories — airline-claim agencies, the death of email-scanning price protection, DoNotPay's regulatory settlement, the EU's discontinued ODR platform, and data-deletion agencies — as a cumulative set of design constraints, and show that every component of the engine is individually proven in production while the composition remains unbuilt. We close with the economics of small claims, the authorized-agent legal framing, and an open rule-corpus governance model.

**Keywords:** dead capital, consumer rights, administrative burden, dark patterns, automation, rules-as-code

---

## 1. Introduction

Most consumers are, at any given time, owed money they will never collect. If you have flown in the EU in the past two years, there is a meaningful chance you are owed €250–€600 under Regulation 261/2004 for a delay or cancellation that the airline attributed to "extraordinary circumstances." If you hold subscriptions, odds are at least one was renewed without the notice your jurisdiction requires, and at least one is costing you money you do not want to spend. If you bought a product with a price-drop guarantee, a warranty, or membership in a class of consumers affected by an antitrust settlement, there is likely a claim window open — with a deadline — that you will not notice until it closes.

None of this is obscure. The rights are codified, the procedures are published, the claimable amounts are computable. And the aggregate numbers are extraordinary:

- **EU261 air passenger compensation:** ~87% of eligible passengers never claim; **€3–6 billion per year** unclaimed (claims-industry estimates — flightowed.com, AirHelp and similar; treat as an interested upper band).
- **Class actions (US):** claims-made response rates of **≤10%** are typical, with 300+ federal settlements open at any moment.
- **Unclaimed property (US):** ~$70 billion held by states, with only ~$4.5–5 billion returned per year.
- **Gift cards:** $21–27 billion in unused balances (a stock); ~$3 billion forfeited annually (the flow).
- **Regulatory redress:** the FTC alone returned $148 million to consumers across 25 programs in 2024 — after the agency did the finding, claiming, and filing.

The pattern across every category is the same: **rights are issued without an execution layer.** Consumers do not exercise entitlements because exercising them is a *process* problem — discover the trigger, know the rule, assemble the evidence, compute the deadline, draft the claim, file through the right channel, follow up, escalate when ignored. Each step is individually small; the compound is prohibitive. And the compound is *by design*: the academic dark-patterns literature has documented at scale that counterparties engineer exactly this friction where it benefits them (Mathur et al. 2019: 1,818 dark patterns across 11K shopping sites; Luguri & Strahilevitz 2021: dark patterns measurably push unwanted subscriptions). The cancellation friction that keeps zombie subscriptions alive (the subject of the companion product PocketVeto) is the same instrument applied to the same population, from the other direction.

This paper's claim is that the appropriate response to systemic friction is not education (knowledge is not the binding constraint) and not more regulation alone (the FTC's click-to-cancel rule was vacated by the Eighth Circuit in July 2025 — regulation is itself a battlefield) — but **claim infrastructure**: software that makes exercising a right as cheap as the counterparty made waiving it.

The contributions:

1. **A formal framing** of consumer rights as dead capital, with a claim-execution model that isolates friction as the binding constraint (Section 4).
2. **A specification** of the personal entitlement engine: four layers, an entitlement lifecycle state machine, a deadline ledger, and an escalation ladder (Section 5).
3. **Case-history analysis** of five prior attempts and adjacent survivors, extracting design constraints rather than eulogies (Section 6).
4. **A governance model** for the open machine-readable rights corpus — the "GDPR for claims" — including versioning across jurisdictions (Section 7).
5. **A legal-risk analysis** of delegated filing under the authorized-agent framing that UPL (unauthorized practice of law) regimes permit (Section 8).
6. **An economic analysis** of small-claim aggregation showing where the engine's unit economics clear and where they structurally cannot (Section 9).

---

## 2. The landscape: single-right services, missing general layer

The territory is not empty — it is *fragmented into single-vertical slices*:

| System | Domain | What it proves | What it misses |
|---|---|---|---|
| AirHelp / Flightright / GetMyFlightCash | EU261 flight claims, end-to-end incl. legal escalation, 25–50% success fees | Full-stack claim execution is viable and profitable at ticket sizes ≥€250 | One statute; user must self-identify eligibility; no ingestion |
| Rocket Money / Trim | Subscription detection + cancellation *help*, bill negotiation | Bank-feed ingestion at scale; willingness to pay for relief | No rights model, no deadlines, no past-charge recovery, no filing |
| Earny / Paribus (both wound down) | Email-scanning price-drop claims against merchant/card price protection | Event-driven discovery + automated filing *worked* | Died when merchants/networks revoked voluntary price protection — voluntary benefits are revocable rails |
| DoNotPay (FTC-settled 2024, $193K) | Template letters across many domains | Demand breadth exists | No rule computation, no real filing, "robot lawyer" framing triggered UPL; user still does the work |
| Incogni / DeleteMe / Permission Slip | Data-broker deletion as authorized representative | **The authorized-agent pattern is legal and scales** (GDPR/CCPA agency) | One right (erasure), corporate counterparties only |
| Class-action finders (openclassactions.com et al.) | Settlement discovery | Inventory exists (300+ open) | No matching to your purchases, no filing |
| Chargeflow / chargeback.io | Chargeback automation | Full automation of a claims-like process | **Merchant side only** — consumer-side chargeback filing is unserved |
| Resolver.co.uk (UK) | Free complaint scaffolding + ombudsman routing across consumer sectors | Demand and routing exist without automation | Manual; no ingestion, no rights computation, no filing |
| EU ODR platform | Cross-border dispute filing (state-run) | Institutional will existed | Discontinued 20 July 2025 — "hardly used"; state-run friction is still friction |

The composition the table implies — *event ingestion × multi-domain rights corpus × deadline ledger × delegated filing* — exists in no product. The term "entitlement engine" returns only B2B licensing, benefits-administration, and identity products. The category is not crowded; it is *unnamed*, exactly as the personal event bus was (P-001), and for the same reason: nobody has composed the proven pieces.

---

## 3. Related work

**Dead capital.** De Soto (2000) used the term for property in developing economies that exists in fact but not in formal, executable title: the house is owned, the business operates, but the asset cannot collateralize credit because no institution recognizes the owner's claim in a form the system can execute. Our extension is precise: a consumer right is title to a claim; the title is valid (the statute says you are owed), but there is no *execution institution* — no registry of your rights, no processor that converts them into filings. The capital exists; it cannot circulate.

**Administrative burden.** Herd, Moynihan, and co-authors (Moynihan, Herd & Harvey 2015; Herd & Moynihan 2018) decompose the cost of interacting with institutions into **learning costs** (finding out a program/rule exists), **compliance costs** (assembling documents, following procedure), and **psychological costs** (stigma, stress, perceived futility). Their context is citizen-state interactions; the same triplet governs consumer-corporate interactions, with one amplification: the counterparty is *adversarial* and actively designs friction (below). The entitlement engine is best understood as an administrative-burden-collapsing machine: it absorbs learning (the corpus knows the rules), compliance (filing is automated), and psychological costs (the deadline ledger replaces vigilance with notification).

**Dark patterns and sludge.** Mathur et al. (2019) crawled 11K shopping sites and cataloged 1,818 dark-pattern instances; Luguri & Strahilevitz (2021) showed experimentally that dark-pattern pressure measurably increases unwanted subscription enrollment. "Sludge" (Thaler & Sunstein's term) generalizes: friction deployed as a policy instrument. The dark-patterns literature frames friction as the adversary; it stops short of proposing claim-side infrastructure as the countermeasure. We take that step.

**Benefit take-up.** Economists have documented low take-up of *government* benefits for decades: Currie (2006) reviews the take-up literature; Bhargava & Manoli (2015) show that psychological frictions — not information — suppress take-up, and that process simplification outperforms information provision. The consumer-corporate analogue is our domain, with one amplifier: the counterparty *designs* the friction. The take-up literature is direct support for the engine's architecture — collapse the process, don't lecture the user.

**Rules-as-code.** The machine-readable-legislation movement (New Zealand's Better Rules program; Bertl et al.; Huggins 2021) encodes statutes as executable logic — but pointed at *government drafting and administration*. The consumer-facing turn is missing: no project encodes consumer-protection law as a corpus that runs against a person's own events to compute what they are owed. Our corpus borrows rules-as-code's discipline (statute → versioned logic, with citation provenance) and re-points it at the beneficiary.

**Legal empirics.** Eisenberg & Miller's line on class-action fee structures and claim rates; Fitzpatrick (2010) on the political economy of unclaimed funds. These supply our dead-capital magnitudes.

---

## 4. Theory: the claim-execution model

### 4.1 Entitlements as latent assets

An **entitlement** is a tuple:

```
E = (τ, r, v, d, c, p)
```

where `τ` is the *trigger event* (a delayed flight, a renewal charge, a delivery arriving late), `r` the *rule* (statute or contract term), `v` the claimable value, `d` the **deadline** (statute of limitations, claims window, chargeback window — typically 60–120 days, sometimes just 14), at which point the value of exercising drops to zero, `c` the *cost* of exercising, and `p` the probability of success conditional on proper filing.

The owner realizes value iff they execute before `d`. Define the **realization rate** of a population of entitlements `{Eᵢ}`:

```
R = Σ realized vᵢ / Σ vᵢ
```

Empirically, in every domain where claim rates are measured (air-passenger compensation, class-action claims-made responses, escheatment recovery, gift-card redemption), realized claim rates sit at or below ~15%. We are not aware of a well-measured counterexample, but the measurement literature is thin and largely interested-party; we state `R ≤ 0.15` as an estimate, not a constant. We define **dead capital** as the unclaimed stock `D = (1 − R)·Σ vᵢ`, and the claim of this paper is that `D`'s magnitude and persistence are *not* explained by `v` being small or `p` being low — they are explained by `c`.

### 4.2 The friction decomposition

Administrative-burden theory gives `c` three components:

```
c = c_learn + c_comply + c_psych
```

- `c_learn`: discovering that the entitlement exists. For EU261, surveys put awareness of the right itself at ~21–79% depending on market; awareness of *specific eligibility* for a specific disruption is far lower.
- `c_comply`: the procedural cost — finding the claim form, assembling evidence (booking reference, delay proof, statement), drafting, submitting, following up. Studies of complaint pathways routinely find multi-channel mazes; the EU's own ODR platform achieved so little throughput it was shut down.
- `c_psych`: anticipated adversarial friction — the expectation of stonewalling, form rejection, and futility.

The critical property is that `c_learn` and much of `c_comply` are **fixed costs, invariant to `v`**. For a €400 flight claim, `c` may be worth paying (hence AirHelp's business). For a $6 delivery refund, a $9 price-drop difference, or a one-month subscription credit, `c > v·p` always. The consequence is a **threshold structure**: every jurisdiction has a de facto claim floor below which rights are, in economic terms, fictional — written but not real. We call this the **friction floor**. Regulation's sporadic attempts to lower the floor (small-claims courts, ODR platforms, click-to-cancel) attack `c_comply` through procedure; counterparty design raises it back (the vacatur of click-to-cancel is the current exhibit). The floor moves; it does not close.

### 4.3 What automation changes

The entitlement engine attacks `c` structurally:

- **`c_learn → 0`:** ingestion discovers trigger events automatically; the corpus computes eligibility. The user learns of an entitlement by being *handed* it, pre-computed.
- **`c_comply → amortized infrastructure cost:** filing labor becomes code. The per-claim fixed cost collapses to near-zero marginal cost; what remains is per-channel integration cost (once per airline, not once per claim).
- **`c_psych → c_escalate:** the engine absorbs the adversarial rounds — follow-ups, deadlock letters, chargeback initiation, regulator complaints — which are precisely the rounds individuals abandon.

**Claim 1 (friction-floor collapse).** The engine attacks each component of `c` directly: `c_learn → 0` (ingestion discovers triggers; the corpus computes eligibility), `c_comply → amortized infrastructure` (filing labor becomes code; per-channel integration cost is amortized over all claims through that channel), `c_psych → c_escalate` (follow-ups, deadlocks, and escalation are absorbed by the machine that does not tire). The claim follows directly from the fixed-cost decomposition: as `c_learn + c_comply` collapse toward marginal cost, the threshold `v·p > c` is satisfied by ever-smaller entitlements, and the set of *economically real* rights expands discontinuously. Rights that are fictional at the individual level become real at the infrastructure level — in the same sense that de Soto's formalization made informal property collateralizable.

**Claim 2 (deadline ledgers convert time).** Human claimants lose entitlements at the deadline-miss rate — empirical deadline-miss behavior in administrative settings (renewal windows, claims periods) makes this loss substantial. A deadline ledger, which is a machine vigilance model, misses none: the value of an entitlement under the ledger decays exactly at `d`, and not before. The ledger is the difference between "rights you could have had" and "rights you have."

**Claim 3 (bundling).** The engine aggregates N small entitlements from the event stream. Per-claim costs being near-zero, the *bundle's* claim value `Σ vᵢ·pᵢ` competes not against per-claim friction but against a single notification-and-approve interaction. Small-claim dead capital is recoverable precisely because it is *composable* — a property no single-right service can exploit, since each sees only its own slice.

### 4.4 Counterparty response

Friction is strategic; removing it invites countermeasure. Airlines already stonewall first-round EU261 claims (AirHelp exists because first-rounds fail); merchants revoked price protection rather than process automated claims (Earny's death); regulation is litigated (click-to-cancel vacatur). The engine's answer is the **escalation ladder** (Section 5.4): each countermeasure raises the claim's procedural tier — merchant channel → chargeback (network-enforced, merchant-funded) → ombudsman/regulator (state-enforced) → small-claims court. The ladder's upper rungs are *mandatory* for counterparties in a way merchant goodwill is not. The engine does not eliminate adversarial friction; it industrializes the escalation path that already exists but is never walked because walking it is `c_comply`-dominated.

---

## 5. Specification: the personal entitlement engine

### 5.1 The four layers

1. **Event layer** — the personal event bus (P-001). The engine subscribes to `finance/payment/v1` (renewals, charges), `travel/disruption/v1` (delays, cancellations), `logistics/shipment/v1` (late deliveries), `commerce/ereceipt/v1` (purchases → warranty windows), `legal/settlement/v1` (class notices) — the canonical type registry defined by P-001 §4.4. This dependency is the P-001/P-002 pairing: the bus makes the entitlement engine's marginal event cost near zero; the engine is the bus's highest-value consumer.
2. **Rights corpus** — a versioned, machine-readable rulebase (Section 7). Each rule is executable logic with statutory citation, jurisdiction scope, effective-date ranges, precedence, and a *filing spec* (channel, required evidence, expected SLA, escalation rungs).
3. **Entitlement ledger** — computed claims: `{matched rule, evidence lineage (event ids), value, deadline, state, filing history}`. Append-only, hash-chained like the bus (the ledger is legal evidence).
4. **Filing agent** — the execution rung: templates + channel adapters (web forms, email APIs, chargeback initiation, regulator portals), operating as the user's **authorized agent** (Section 8) with per-claim or standing authorization.

### 5.2 Entitlement lifecycle state machine

```
latent → matched → computed → (user-ack) → filed → [acknowledged | stonewalled | rejected]
       → escalated (tier t → t+1 on stonewall-past-SLA or rejected-with-surviving-merit)
       → [settled | rejected_final]
       ⟂ expired  (reachable from ANY active state when the deadline passes — deadlines do not wait for the state machine)
       ⟂ withdrawn (user-initiated, from any state)
```

`rejected_final` differs from a tier-level `rejected` in having exhausted the ladder; the transition relation is: *escalate* iff stonewalled past the channel's SLA or rejected with merit surviving the rule's evidence requirements; *expire* at `d`; *withdraw* by user. States the user sees: *matched* ("you may be owed X — approve filing?"), *filed*, *escalated*, *settled* (with recovery tracking), *expiring soon* (deadline pressure, the ledger's core notification), *expired* (with the record retained — expired claims are evidence for future pattern claims).

### 5.3 The deadline ledger

First-class object: `{entitlement, hard deadline, soft reminders at d−14, d−7, d−2}`. Where deadlines are contestable (discovery rules), the ledger holds both the conservative and aggressive readings. The ledger is the engine's *attention product*: its notification cadence is the only UI most users will ever touch.

### 5.4 The escalation ladder

Per-rule filing spec encodes the ladder:

```
tier 0: counterparty channel (form/email, SLA 30d)
tier 1: payment-network chargeback (Reg E/Z, network rules; merchant-funded, reversal standards set by the networks rather than the merchant)
tier 2: ombudsman / regulator complaint (national ombudsman and ADR bodies, CFPB, state AGs, aviation national enforcement bodies)
tier 3: small-claims / specialized court (automated filing, in-person limit acknowledged)
```

Escalation is default-on-when-stonewalled, not opt-in: the engine's comparative advantage over a human claimant is precisely that it does not tire at tier 0.

### 5.5 Evidence computation

Every entitlement's evidence set is derived from event lineage: the renewal charge (bus event) + the statute's notice requirement (corpus rule) + the *absence* of a consent event (a negative query over the log, which yields evidence of **non-observation through the capture channel** — probative but not dispositive: the phone may have been off, the notification missed, the parser may have failed). Claims resting on absence are flagged for user attestation before filing; P-001 §4.2's evidence-grade retention preserves chain continuity for what *was* observed, not proof of what was not. The engine never asks the user for documents it can derive; it asks only for what only the user knows (intent, preference).

---

## 6. Case histories as design constraints

We read the five prior attempts not as eulogies but as a cumulative spec.

**AirHelp (survivor).** Proves: full-stack execution with legal escalation is a viable business at ticket size ≥ €250 with 25–50% contingency fees. Constrains: percentage fees leave small claims unserved — the engine must amortize, not take percentages; single-vertical ingestion requires user data entry — the engine's event subscription is the difference.

**Earny/Paribus (dead 2020s).** Proves: email event ingestion + automated claim filing *worked mechanically*. Constrains: their rails were *voluntary* merchant price-protection policies, revocable at will — and revoked. The engine must prefer *statutory* rails (EU261, chargeback windows, small-claims) that counterparties cannot revoke, and treat voluntary benefits as opportunistic tier-0 claims only.

**DoNotPay (FTC-settled $193K, 2024).** Proves: enormous demand breadth for consumer self-help. Constrains: (a) the "robot lawyer" framing is UPL-radioactive; (b) template letters without rule computation just relocate the work to the user. The engine must be an *authorized agent with traceable computation* (each filing cites the matched rule and its statutory source), never a persona of counsel.

**EU ODR platform (discontinued July 2025).** Proves: institutional will to build consumer claim infrastructure existed at the EU level. Constrains: state-run *destination* platforms still impose learning + compliance costs on the claimant — users must know to come, know what to file, and file correctly. Distribution and computation must be ambient (on the user's events), not destination.

**Incogni/DeleteMe/Permission Slip (survivors).** Prove: the authorized-agent pattern — a company acting as the consumer's representative for a specific statutory right — is lawful, scalable, and subscription-fundable. Constrains: they are single-right. The engine's corpus is the generalization; Incogni is what one row of the corpus looks like as a whole company.

The synthesis: every failure was a *framing* failure (voluntary rails, UPL posturing, destination distribution) or a *sequencing* failure (single vertical → no amortization). None falsifies the mechanism. The composition constraints are: statutory rails first, authorized-agent framing, ambient distribution, multi-rule corpus for amortization.

---

## 7. The rights corpus: "GDPR for claims"

The corpus is the engine's long-term moat and its hardest maintenance problem. Design:

- **Rule form:** each rule = trigger pattern (over bus event types) × predicate (eligibility logic) × value function × deadline function × filing spec (channel, evidence, ladder) × provenance (citation, version, jurisdiction, effective dates, precedence).
- **Governance:** community-maintained open core (the GitHub-model of statute encodings; TOSBack's dormant dataset is the precedent for policy terms), with commercial adapters on top. Jurisdictionality is a packaging dimension: the same event matched against the user's jurisdiction's rule version.
- **Volatility management:** statutes shift (EU261 revisions, click-to-cancel vacatur/reg revival cycles); the corpus treats every rule as effective-dated logic, and entitlement computation pins the rule version in force at trigger time — a claim's legal basis must be a snapshot, not a floating reference.

The corpus is where research contribution is heaviest: a versioned, provenance-carrying encoding discipline for consumer-rights logic, which rules-as-code built for governments and nobody has built for consumers.

---

## 8. Legal risk: authorized agent, not robot lawyer

The DoNotPay line is the boundary. On the permitted side: agents filing claims on behalf of a principal under the principal's authorization is ordinary agency — Incogni files deletion requests by the thousand; claim agencies (AirHelp) litigate as assignees; chargeback filing by an agent is routine. The risks concentrate in: (a) *court* filings (small-claims appearance rules vary; UPL exposure grows with tribunal formality) — the engine's tier-3 must be jurisdiction-gated and possibly human-assisted; (b) *advice* vs. *computation* — stating "Rule X matched your event; the statute says Y; filing template Z" is computation with citations, not personalized counsel; the boundary must be enforced in the product's language; (c) *delegation depth* — standing vs. per-claim authorization; the engine should default to per-claim approval with standing grants opt-in per rule tier.

We flag, without resolving, the deepest question: whether industrialized claim-filing changes counterparties' behavior at equilibrium (they design friction against a population of claimants that mostly never claims; a claimant population that always claims changes their optimal policy). The honest position: that is the point — the friction equilibrium is the externality being corrected — but expect regulatory attention once the engine's volume is visible.

### 8.1 Abuse and misuse

An industrial claimant is also a potential weapon: mass nuisance claims, false-positive filings at volume, regulator-complaint flooding, fee-harvesting "agents" posing as the engine's pattern. We treat misuse as a first-class design constraint: per-channel rate limits; per-rule kill switches triggered by accuracy telemetry (a rule whose filings fail at anomalous rates disables itself); accuracy bonds for escalated tiers; per-filing user attestation wherever evidence is absence-based; and per-claim audit logs the user can hand to a regulator. The governance question — who watches a machine that files claims by the thousand — is open, and we would rather name it than be surprised by it.

---

## 9. Economics

Per-claim economics: the engine's marginal cost per filing ≈ compute + channel integration amortization. Chargeback initiation via card-network rails is electronically filed; regulator complaints are web forms; merchant emails are near-free. The cost structure implies: (a) small claims clear only *in aggregate* (Proposition 3) — the product is a portfolio, one recovery dashboard, not a claim service; (b) revenue models that align: subscription (flat, like Incogni) or percentage *only on escalated tiers* where success is uncertain and the user opts in; (c) the flywheel: every settled claim is a proof artifact that trains channel integrations and evidences the corpus's correctness — the engine compounds like debt collection agencies do, but for consumers.

What does not clear: court-tier claims without volume concentration; claims requiring physical presence; jurisdictions with no usable rail at any tier. Those remain dead capital even under the engine — the honest residual.

---

## 10. Limitations

1. **Dependency risk:** the engine's discovery layer *is* P-001's event bus; on iOS the ingestion surface shrinks to e-mail (confirmation mails, e-receipts, settlement notices — plausibly a substantial share of claim-relevant events, though we know of no measurement of that share and state it as an assumption, not a fact). Mitigated, not eliminated.
2. **Corpus maintenance is forever:** statutes, forms, and counterparty channels rot continuously; the open-core model distributes but does not eliminate the burden.
3. **Counterparty equilibrium shifts** (Section 4.4): the arms race is intrinsic; the ladder's upper rungs are the stable ground.
4. **UPL boundary is jurisdictional and moving:** tier-3 gating is mandatory, and the product's language discipline is a legal surface, not just UX.
5. **Measurement problem:** dead-capital estimates are industry- or regulator-sourced, not academic; the paper's magnitudes carry that uncertainty. The engine itself — instrumenting a real population's entitlement flows — would be the first rigorous measurement instrument for consumer dead capital, which is a research contribution independent of the product.

---

## 11. Roadmap

1. **v0 (now):** corpus schema + 3 rules (EU261, one subscription auto-renewal statute, one card chargeback window) matched against PocketVeto's existing payment event stream — the repo's own ledger becomes the first entitlement substrate.
2. **v1:** deadline ledger + notification product; tier-0 filing via email templates with evidence packs.
3. **v2:** tier-1 chargeback initiation; corpus open-core launch with contribution protocol.
4. **v3:** regulator complaint automation (tier 2); jurisdiction expansion; small-claims tier behind jurisdiction gating.
5. **Research program:** instrumented deployment → first empirical measurement of household dead-capital flows; the dead-capital census.

---

## 12. Conclusion

Consumer protection law has spent fifty years perfecting the issuance of rights and left their execution to the individual, unprotected against counterparties whose business model includes making execution expensive. The result is the largest pool of unclaimed, legally-owned value in the consumer economy — dead capital in de Soto's exact sense: valid title, no execution institution. The personal entitlement engine is that institution: event-driven discovery, machine-readable rights, deadline ledgers, and delegated filing walking an escalation ladder that already exists in law. Every component is proven somewhere in production; the composition is unbuilt; the demand is measured in the billions unclaimed. The companion paper P-001 supplies the missing ingestion layer; this paper supplies the reason it matters.

---

## Appendix A — Survey method

Landscape claims (Table 1, the magnitude tally) derive from structured web searches conducted 6–7 October 2026 via a commercial search API: ~100 queries across {each named competitor + category terms ("automated refund claim app", "class action claim filing automation", "chargeback consumer automation", "GDPR article 17 agent", "flight compensation unclaimed estimate")}, English-language, first 10 results per query; inclusion = the product/service claims to help consumers claim a right; exclusion = merchant-side dispute tooling. Magnitudes were cross-checked against at least two sources where possible and are flagged as interested-party where they are (claims-industry estimates dominate the EU261 figures — treat unclaimed-value magnitudes as order-of-magnitude, not accounting). Raw result JSONs are retained in the program's research archive.

## Disclosure

The p-rick program is developed alongside PocketVeto (this repository), whose payment event stream is proposed as the engine's first substrate. The program's interest in the category's existence is therefore not disinterested; readers should weigh the positioning accordingly.

---

## References

- de Soto, H. (2000). *The Mystery of Capital: Why Capitalism Triumphs in the West and Fails Everywhere Else*. Basic Books.
- Moynihan, D., Herd, P., & Harvey, H. (2015). Administrative burden: learning, psychological, and compliance costs in citizen-state interactions. *Journal of Public Administration Research and Theory*, 25(1).
- Herd, P., & Moynihan, D. (2018). *Administrative Burden: Policymaking by Other Means*. Russell Sage.
- Mathur, A., Kshirsagar, M., & Mayer, J. (2019). Dark patterns at scale: findings from a crawl of 11K shopping websites. *Proc. ACM CSCW*.
- Luguri, J. B., & Strahilevitz, L. (2021). Shining a light on dark patterns. *Journal of Legal Analysis*, 13(1).
- Thaler, R., & Sunstein, C. (2021). *Sludge*. MIT Press.
- Huggins, R. L. (2021). Machine-readable legal documents. QUT Law Review / eprints.qut.edu.au; New Zealand "Better Rules for Government," digital.govt.nz; Bertl et al., legal text to computational logic.
- Currie, J. (2006). The take-up of social benefits. NBER Working Paper 10488; Bhargava, S., & Manoli, D. (2015). Psychological frictions and the incomplete take-up of social benefits: evidence from an IRS field experiment. *American Economic Journal: Economic Policy*, 7(4).
- Eisenberg, T., & Miller, G. P. (2010). Attorney fees and expenses in class action settlements. *Journal of Empirical Legal Studies* — and the broader Eisenberg–Miller empirical line; claim-rate figures additionally sourced to claims-administration and ILR reports (instituteforlegalreform.com).
- Regulation (EC) No 261/2004 (air passenger compensation); FTC Act §5; ROSCA; Reg E; Magnuson-Moss Warranty Act; state auto-renewal statutes.
- FTC (2024). FTC redress to consumers: $148 million across 25 programs. ftc.gov enforcement returns reporting.
- Eighth Circuit (2025). Vacation Touring News, Inc. v. FTC — negative-option ("click-to-cancel") rule vacated, 8 July 2025.
- FTC (2024). DoNotPay stipulated order ($193K; order finalized February 2025). ftc.gov.
- European Commission (2025). Discontinuation of the ODR platform. consumer-redress.ec.europa.eu.
- Unclaimed-figures: flightowed.com, bottomline.co.uk, Business Insider, liccardo.house.gov (2024 return: $4.49B), MarketWatch/creditcards.com (gift cards).
- PocketVeto (2025–2026). Payment event capture as entitlement substrate. github.com/srivtx/pocketveto.
