# @kudos-protocol/storage-postgres

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

- @kudos-protocol/ports@0.0.3
- @kudos-protocol/pool-core@0.0.3

## 0.0.2

### Patch Changes

- ea52340: initial pool server build
- Updated dependencies [ea52340]
  - @kudos-protocol/pool-core@0.0.2
  - @kudos-protocol/ports@0.0.2
