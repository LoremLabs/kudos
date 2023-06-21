# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Subsections: (Added, Changed, Deprecated, Removed, Fixed, Security)

## [Unreleased]

## [0.0.13] - 2023-06-21

### Added

- Default from config object

## [0.0.12] - 2023-06-21

### Fixed

- Reset debug default for POOl_ENDPOINT

## [0.0.11] - 2023-06-21

### Fixed

- Reset debug statement

## [0.0.10] - 2023-06-21

### Changed

- Prefer `crypto.webcrypto.getRandomValues` api over `crypto.getRandomValues` to support older node versions.

### Fixed

- On wallet init, mkdir needs to happen before writing a file.

## [0.0.9] - 2023-06-07

### Added

- Add message on `setler wallet mnemonic` when no mnemonic exists.
- `setler wallet init` has message on success unless squelched with --quiet
- Added option to `gatekey` to only check certain networks, allowing less interaction for kudos-only functions
- `setler kudos list --poolId ...` to list all the kudos in a pool. To be similar to kudos send usage. May remove `setler pool` equivalent in the future.
- Add `context.config.auth` to store `SETLER_KEYS`, etc.

## [0.0.8] - 2023-05-25

### Fixed

- `setler kudos identify` lowercases github, twitter usernames
- update auth to include signature for inking

## [0.0.7] - 2023-05-03

### Added

- `setler kudos identify` supports `--quiet` to silence output
- `--poolEndpoint` flag to set the pool endpoint on a command by command basis

## [0.0.6] - 2023-05-03

### Added

- `setler kudos identify` supports --skipMainPackage to not give weight to the main package
- `setler kudos identifiy` documentation
- `setler kudos identify` no longer creates kudos for zero weights
- `setler kudos identify` automatically creates twitter, github, reddit ids for contributors from urls
- `setler kudos identify` parses package.author as an object

### Fixed

- `setler kudos identify` no longer doubles the weight between dev and regular dependencies
- formatting on changelog

## [0.0.5] - 2023-05-03

### Added

- `setler wallet keys env --filter=kudos` command

### Fixed

- 0.0.4 env mode did not work

## [0.0.4] - 2023-05-03

### Added

- This changelog.
- More documentation for `setler auth`
- Allow pool ink without full keys for GitHub actions
