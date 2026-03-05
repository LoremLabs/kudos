---
"@kudos-protocol/pool-server": patch
"@kudos-protocol/server": patch
"@kudos-protocol/storage-sqlite": patch
"@kudos-protocol/storage-postgres": patch
"@kudos-protocol/worker-outbox": patch
"@kudos-protocol/ports": patch
"@kudos-protocol/pool-core": patch
---

Fix npm publish: resolve workspace refs in-place before publishing from the package directory, restoring OIDC trusted publishing compatibility. Add `"files": ["dist"]` and pre-publish build step so compiled output is included in tarballs.
