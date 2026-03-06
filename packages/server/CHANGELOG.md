# @kudos-protocol/server

## 0.4.2

### Patch Changes

- @kudos-protocol/ports@0.4.2
- @kudos-protocol/pool-core@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [d3715b9]
  - @kudos-protocol/ports@0.4.1
  - @kudos-protocol/pool-core@0.4.1

## 0.4.0

### Patch Changes

- @kudos-protocol/ports@0.4.0
- @kudos-protocol/pool-core@0.4.0

## 0.3.0

### Minor Changes

- d741ff3: Add settlement-grade distribution endpoint

  - `POST /core/v1/pools/{poolId}/distribution` — computes deterministic integer allocation of `totalPie` across pool recipients using largest-remainder method with bigint math
  - All settlement values on the wire are base-10 strings (via new `bigintToString` helper)
  - New `computeDistribution()` pure function in pool-core
  - New `readRecipientTotals()` storage method returns bigint-native data without lossy Number() conversion
  - Zero-allocation recipients are excluded from the response
  - Invariant: `sum(points) === totalPie` (exact, no rounding loss)
  - OpenAPI spec updated with full endpoint documentation

### Patch Changes

- Updated dependencies [d741ff3]
  - @kudos-protocol/pool-core@0.3.0
  - @kudos-protocol/ports@0.3.0

## 0.2.0

### Minor Changes

- 7c74d02: Add pool meta

### Patch Changes

- Updated dependencies [7c74d02]
  - @kudos-protocol/pool-core@0.2.0
  - @kudos-protocol/ports@0.2.0

## 0.1.9

### Patch Changes

- @kudos-protocol/ports@0.1.9
- @kudos-protocol/pool-core@0.1.9

## 0.1.7

### Patch Changes

- Updated dependencies [6380b34]
  - @kudos-protocol/ports@0.1.7
  - @kudos-protocol/pool-core@0.1.7

## 0.1.6

### Patch Changes

- 3386052: Build pipeline bump
- Updated dependencies [3386052]
  - @kudos-protocol/pool-core@0.1.6
  - @kudos-protocol/ports@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies
  - @kudos-protocol/pool-core@0.1.5
  - @kudos-protocol/ports@0.1.5

## 0.1.4

### Patch Changes

- 4fdcfed: deploy woes
- Updated dependencies [4fdcfed]
  - @kudos-protocol/pool-core@0.1.4
  - @kudos-protocol/ports@0.1.4

## 0.1.3

### Patch Changes

- 699da10: Fix npm publish: resolve workspace refs in-place before publishing from the package directory, restoring OIDC trusted publishing compatibility. Add `"files": ["dist"]` and pre-publish build step so compiled output is included in tarballs.
- Updated dependencies [699da10]
  - @kudos-protocol/ports@0.1.3
  - @kudos-protocol/pool-core@0.1.3

## 0.1.2

### Patch Changes

- 29549b8: Add `"files": ["dist"]` so compiled output is included in published tarballs. Previous releases excluded `dist/` because it was in `.gitignore` and no `files` field was set.
- Updated dependencies [29549b8]
  - @kudos-protocol/ports@0.1.2
  - @kudos-protocol/pool-core@0.1.2

## 0.1.1

### Patch Changes

- 1ff4e5e: Fix missing compiled output in published packages. The 0.1.0 release contained only TypeScript source files because the build step was skipped during the publish run. Added a pre-publish build step to the release workflow.
- Updated dependencies [1ff4e5e]
  - @kudos-protocol/ports@0.1.1
  - @kudos-protocol/pool-core@0.1.1

## 0.1.0

### Patch Changes

- 4f251bb: Fix published packages containing literal `workspace:*` in their dependencies instead of real version numbers. Use `pnpm pack` to build tarballs (which resolves workspace references) before publishing with `npm publish`. Also change all internal dependencies from `workspace:*` to `workspace:^` so published versions get proper semver ranges like `^0.0.4`.
- Updated dependencies [4f251bb]
- Updated dependencies [7839455]
  - @kudos-protocol/ports@0.1.0
  - @kudos-protocol/pool-core@0.1.0

## 0.0.4

### Patch Changes

- @kudos-protocol/ports@0.0.4
- @kudos-protocol/pool-core@0.0.4

## 0.0.3

### Patch Changes

- 311bd6d: npm automation
  - @kudos-protocol/ports@0.0.3
  - @kudos-protocol/pool-core@0.0.3

## 0.0.2

### Patch Changes

- ea52340: initial pool server build
- Updated dependencies [ea52340]
  - @kudos-protocol/pool-core@0.0.2
  - @kudos-protocol/ports@0.0.2
