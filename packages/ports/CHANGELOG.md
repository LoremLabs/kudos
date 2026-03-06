# @kudos-protocol/ports

## 0.2.0

### Minor Changes

- 7c74d02: Add pool meta

### Patch Changes

- Updated dependencies [7c74d02]
  - @kudos-protocol/pool-core@0.2.0

## 0.1.9

### Patch Changes

- @kudos-protocol/pool-core@0.1.9

## 0.1.7

### Patch Changes

- 6380b34: bump
  - @kudos-protocol/pool-core@0.1.7

## 0.1.6

### Patch Changes

- 3386052: Build pipeline bump
- Updated dependencies [3386052]
  - @kudos-protocol/pool-core@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies
  - @kudos-protocol/pool-core@0.1.5

## 0.1.4

### Patch Changes

- 4fdcfed: deploy woes
- Updated dependencies [4fdcfed]
  - @kudos-protocol/pool-core@0.1.4

## 0.1.3

### Patch Changes

- 699da10: Fix npm publish: resolve workspace refs in-place before publishing from the package directory, restoring OIDC trusted publishing compatibility. Add `"files": ["dist"]` and pre-publish build step so compiled output is included in tarballs.
- Updated dependencies [699da10]
  - @kudos-protocol/pool-core@0.1.3

## 0.1.2

### Patch Changes

- 29549b8: Add `"files": ["dist"]` so compiled output is included in published tarballs. Previous releases excluded `dist/` because it was in `.gitignore` and no `files` field was set.
- Updated dependencies [29549b8]
  - @kudos-protocol/pool-core@0.1.2

## 0.1.1

### Patch Changes

- 1ff4e5e: Fix missing compiled output in published packages. The 0.1.0 release contained only TypeScript source files because the build step was skipped during the publish run. Added a pre-publish build step to the release workflow.
- Updated dependencies [1ff4e5e]
  - @kudos-protocol/pool-core@0.1.1

## 0.1.0

### Patch Changes

- 4f251bb: Fix published packages containing literal `workspace:*` in their dependencies instead of real version numbers. Use `pnpm pack` to build tarballs (which resolves workspace references) before publishing with `npm publish`. Also change all internal dependencies from `workspace:*` to `workspace:^` so published versions get proper semver ranges like `^0.0.4`.
- Updated dependencies [4f251bb]
- Updated dependencies [7839455]
  - @kudos-protocol/pool-core@0.1.0

## 0.0.4

### Patch Changes

- @kudos-protocol/pool-core@0.0.4

## 0.0.3

### Patch Changes

- @kudos-protocol/pool-core@0.0.3

## 0.0.2

### Patch Changes

- ea52340: initial pool server build
- Updated dependencies [ea52340]
  - @kudos-protocol/pool-core@0.0.2
