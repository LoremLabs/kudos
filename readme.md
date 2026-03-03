<img width="956" alt="image" src="https://user-images.githubusercontent.com/170588/227725910-08724854-f961-4f36-ae32-1eb09b7eac00.png">

# Kudos

Kudos is a reference implementation of an **attribution-based allocation system**.

It enables people to record who helped them — across the web, in software, in collaboration — and later allocate a fixed budget proportionally to those attributions.

> Kudos is not a token.
> Kudos is not a cryptocurrency.
> Kudos is not a payment network.

Kudos is an allocation engine that makes generosity automatic.

It separates:

- Signal (who helped you)
- Allocation (how much weight they receive)
- Settlement (how money is distributed)

## The Key Insight

> Attribution is free.
> Allocation is computed later.
> Money follows patterns, not clicks.

said another way:

> Creative work should not require a price tag at every interaction.
> Value is measured over time.
> Settlement is a proportional reflection of recorded contribution.

------------------------------------------------------------------------

## The Model

At its core, Kudos is:

1. **Fix a budget for a class of value**
   For example: You may budget $100/month for open source.

2. **Record attribution events**  
   Users or their software generate kudos for identifiers (email, username, DID, etc.).

3. **Allocate a budget proportionally**  
   At the end of a cycle (e.g., monthly / lunation), a fixed budget is split across all recorded attributions based on weight.

Formula:

```
recipient_share = budget × (recipient_weight ÷ total_weight)
```

Attribution precedes money.
Settlement is a function of recorded attribution.

------------------------------------------------------------------------

## High-level system:

- Clients emit attribution signals
- Server records and indexes kudos
- Cycles compute proportional allocations
- Settlement layer applies compliance rules
- Funds are optionally distributed via supported rails

## Architecture

### Signal Layer

Clients emit append-only kudos events.

### Allocation Layer

Cycles aggregate events and compute proportional distributions
deterministically.

### Settlement Layer

Identifiers resolve to verified subjects.
Compliance and eligibility rules are enforced before payout.

------------------------------------------------------------------------

## Identity & Subjects

Kudos uses a light-weight canonical identity abstraction called a **Subject**.

A Subject is:

type + opaque identifier

Example:

`email:matt@example.com`

Other examples:

`github:octocat`
`domain:example.com`  
`subject:3f9a8c2e...`
`pool:https://pool.server...`

At the signal layer, any valid subject can receive kudos.

At settlement time:

- Subjects resolve to verified canonical entities.
- Routing changes apply only to future cycles.
- Compliance and eligibility checks occur before payout.

This separation allows attribution to remain flexible while settlement remains deterministic and compliant.

------------------------------------------------------------------------

## Usage

[In a Moon](https://www.inamoon.com) is built using kudos.

## License

MIT License. See LICENSE.
