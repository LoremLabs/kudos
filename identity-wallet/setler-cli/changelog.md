# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Subsections: (Added, Changed, Deprecated, Removed, Fixed, Security)

## [Unreleased]

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

## Fixed

- 0.0.4 env mode did not work

## [0.0.4] - 2023-05-03

### Added

- This changelog.
- More documentation for `setler auth`
- Allow pool ink without full keys for GitHub actions
