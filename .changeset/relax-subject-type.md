---
"@kudos-protocol/pool-core": minor
---

Relax subject type restriction from lowercase ASCII letters only (`[a-z]{1,32}`) to any non-colon, non-whitespace characters (`[^:\s]{1,128}`). This allows subject types like `email+hash`, `did.web`, `X509`, and types with digits. Downstream consumers can enforce stricter rules via the `validateSubject` policy hook.
