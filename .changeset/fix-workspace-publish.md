---
"@kudos-protocol/pool-server": patch
"@kudos-protocol/server": patch
"@kudos-protocol/storage-sqlite": patch
"@kudos-protocol/storage-postgres": patch
"@kudos-protocol/worker-outbox": patch
"@kudos-protocol/ports": patch
"@kudos-protocol/pool-core": patch
---

Fix published packages containing literal `workspace:*` in their dependencies instead of real version numbers. Use `pnpm pack` to build tarballs (which resolves workspace references) before publishing with `npm publish`. Also change all internal dependencies from `workspace:*` to `workspace:^` so published versions get proper semver ranges like `^0.0.4`.
