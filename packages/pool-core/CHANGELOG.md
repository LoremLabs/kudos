# @kudos-protocol/pool-core

## 0.1.4

### Patch Changes

- 4fdcfed: deploy woes

## 0.1.3

### Patch Changes

- 699da10: Fix npm publish: resolve workspace refs in-place before publishing from the package directory, restoring OIDC trusted publishing compatibility. Add `"files": ["dist"]` and pre-publish build step so compiled output is included in tarballs.

## 0.1.2

### Patch Changes

- 29549b8: Add `"files": ["dist"]` so compiled output is included in published tarballs. Previous releases excluded `dist/` because it was in `.gitignore` and no `files` field was set.

## 0.1.1

### Patch Changes

- 1ff4e5e: Fix missing compiled output in published packages. The 0.1.0 release contained only TypeScript source files because the build step was skipped during the publish run. Added a pre-publish build step to the release workflow.

## 0.1.0

### Minor Changes

- 7839455: Relax subject type restriction from lowercase ASCII letters only (`[a-z]{1,32}`) to any non-colon, non-whitespace characters (`[^:\s]{1,128}`). This allows subject types like `email+hash`, `did.web`, `X509`, and types with digits. Downstream consumers can enforce stricter rules via the `validateSubject` policy hook.

### Patch Changes

- 4f251bb: Fix published packages containing literal `workspace:*` in their dependencies instead of real version numbers. Use `pnpm pack` to build tarballs (which resolves workspace references) before publishing with `npm publish`. Also change all internal dependencies from `workspace:*` to `workspace:^` so published versions get proper semver ranges like `^0.0.4`.

## 0.0.4

## 0.0.3

## 0.0.2

### Patch Changes

- ea52340: initial pool server build
