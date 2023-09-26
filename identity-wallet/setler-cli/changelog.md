# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Subsections: (Added, Changed, Deprecated, Removed, Fixed, Security)

## [Unreleased]

## [0.0.26] - 2023-09-26

### Changed

- move dependency from dev to regular

## [0.0.25] - 2023-09-26

### Added

- Scope now works through more functions allowing for multiple mnemonic wallets to be used.
- noPassword option for `setler wallet init` to allow for automated wallet creation with password of "password". This is not recommended for production use, but helps standardize seeds.
- SourceTag now included to identify transactions as coming from the Kudos Setler.
- X-addresses now supported for sending

### Changed

- Minimums for `setler kudos send` are now 2 \* the current send fee.

## [0.0.24] - 2023-09-25

### Removed

- Removed unused `send` top level command

### Added

- Added `setler kudos send --to email:me@example.com` to send directly to a subject.
- Readme now includes information on changing the default network.
- Readme includes information on sending directly to a subject.
- Kudos memodata now includes encrypted kudos information in memo using subject's pubkey or bootstrap's default.

## [0.0.23] - 2023-09-02

### Added

- Bootstrap mode to send unspent budget to the bootstrap address to support general kudos development, etc.

### Removed

- Removed the "thanks" method, as it's replaced by bootstrap mode.

## [0.0.22] - 2023-09-01

### Added

- Better example for setler ns set, as network is already in $s
- Setle Kudos via url: `kudos send --url`

### Changed

- Tried to make logging better for ns and auth.

## [0.0.21] - 2023-08-09

### Changed

- Use `@kudos-protocol/subject-hash` instead of internal implementation.

## [0.0.20] - 2023-08-09

### Changed

- `setler auth login` now uses Ident.Agency based backend, similar to `setler ns set`
- Use subjects instead of dids as identifier type in kudos send and send
- Use DNS-based resolution instead of GQL

### Removed

- Removed `setler ident` command

## [0.0.19] - 2023-08-09

### Added

- `setler ns ...` use Ident.Agency lookup to convert a subject into a DNS entry, including ability to set, get, and lookup subjects

## [0.0.18] - 2023-08-08

### Added

- Quiet mode for `setler pool list --quiet $POOL_ID` returns exit code 0 on found, 1 on not found, 2 on error

### Changed

- Remove PII from kudos memo

### Fixed

- Removed console.log in pool function

## [0.0.17] - 2023-08-07

### Fixed

- Removed duplicated `expandDid` function
- Don't include Skipped in total number to send

### Added

- Allow flag to create Kudos with Escrow
- Extra debugging to ident
- `whoami` action to show current address, public key
- `message` action to debug encrypted messages including chat mode
- New functions encryprt/decrypt to coins lib
- Wallet now has `send` option to send funds to another address
- Added setler help documentation.

### Changed

- `setler kudos send` now uses `thanks` method to publish encrypted identity to the blockchain instead of `escrow` option

## [0.0.15] - 2023-07-03

### Fixed

- Try pegging scure/bip39 to `1.1.1` to temporarily fix wordlist issue

## [0.0.14] - 2023-07-03

### Fixed

- Upgrade scure/bip39 in effort to fix './wordlists/english.js' is not defined by "exports"

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
