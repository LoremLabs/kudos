<img width="956" alt="image" src="https://user-images.githubusercontent.com/170588/227725910-08724854-f961-4f36-ae32-1eb09b7eac00.png">

# Kudos

Kudos is an attribution-based allocation system.

It allows people to record who helped them and later allocate a fixed
budget proportionally to those attributions.

Kudos separates:

-   **Signal** --- who helped you
-   **Allocation** --- how weight is calculated
-   **Settlement** --- how funds are distributed

Kudos is not a token or cryptocurrency.
It is a deterministic allocation engine used by [In a Moon](https://www.inamoon.com).

------------------------------------------------------------------------

## The Model

1.  Record attribution events ("kudos") for identifiers.
2.  At the end of a cycle, split a fixed budget proportionally.

Formula:

recipient_share = (recipient_weight / total_weight) \* budget

Attribution precedes money.
Settlement is a function of recorded attribution.

------------------------------------------------------------------------

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

## License

MIT License. See LICENSE.
