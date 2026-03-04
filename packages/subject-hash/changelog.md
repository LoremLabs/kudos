# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Subsections: (Added, Changed, Deprecated, Removed, Fixed, Security)

## [Unreleased]

## [1.0.3] - 2026-03-04

### Fixed

- CLI now processes all lines from stdin (was only first line).
- Fixed CLI executable permissions in published package.

## [1.0.0] - 2026-03-04

### Changed

- **BREAKING**: `getSubjectHash()` is now synchronous (was async).
- **BREAKING**: Default output is now 22-char base64url (was DNS-friendly hex split).
- **BREAKING**: Uses Node.js `crypto` module instead of `@noble/hashes`.
- **BREAKING**: Input is trimmed but not lowercased — caller is responsible for normalization.
- Rewritten in TypeScript with type declarations.

### Added

- Support for multiple output formats: `"base64url"` (default), `"hex"`, `"bigint"`.
- CLI with `--hex`, `--bigint`, `--json` flags and stdin support.

### Removed

- **BREAKING**: Removed `getSubjectSubdomain()` function.
- **BREAKING**: Removed `lookupMetadata()` function.
- **BREAKING**: Removed `getSubjectPayVia()` function.
- Removed `@noble/hashes` dependency (no runtime dependencies).

## [0.0.3] - 2023-08-28

### Fixed

- Fixed documentation formatting.

### Added

- Added `getSubjectHash` function to the library, converting between subject and subject hash.
- Added `lookupMetadata` function to the library, looking up metadata for a subject hash.

## [0.0.2] - 2023-08-09

### Added

- The right library index.js file. Hopefully.

## [0.0.1] - 2023-08-09

The wrong library file was checked in... so we're skipping this version.

### Added

- This changelog.
- Created library and documentation.
