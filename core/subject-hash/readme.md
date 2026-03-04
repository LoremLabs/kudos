# @kudos-protocol/subject-hash

This library converts a subject identifier (for example
`email:user@example.com`) into a **stable 128-bit identifier** suitable
for use in databases, ledgers, routing systems, etc.

It is the reference implementation of the **Subject Hash** used across
the Kudos Protocol ecosystem.

------------------------------------------------------------------------

# Install

``` bash
npm install @kudos-protocol/subject-hash
```

------------------------------------------------------------------------

# Overview

A **Subject** in the Kudos Protocol is a canonical identifier for an
entity:

    type:opaque_id

Examples:

    email:user@example.com
    github:octocat
    pool:https://kps.example.com/pool/abc
    subject-hash:tmwIJmeStJDSo9giG47rcw

Subject hashes provide a compact, fixed-length identifier derived from
the subject string.

------------------------------------------------------------------------

# Algorithm

The Subject Hash algorithm is defined as:

    SubjectHash(subject) :=
        base64url( SHA256(trim(subject))[0..15] )

Steps:

1.  Convert input to string and trim whitespace
2.  Compute SHA-256 of the subject
3.  Take the **first 16 bytes (128 bits)** of the digest
4.  Encode using **Base64 URL-safe encoding (RFC 4648, no padding)**

This produces a **22-character identifier**.

Example:

    email:user@example.com
    ↓
    tmwIJmeStJDSo9giG47rcw

------------------------------------------------------------------------

# Usage

## Default (base64url)

``` javascript
import { getSubjectHash } from "@kudos-protocol/subject-hash"

const hash = getSubjectHash("email:user@example.com")

console.log(hash)
// tmwIJmeStJDSo9giG47rcw
```

------------------------------------------------------------------------

## Hex output

``` javascript
const hash = getSubjectHash("email:user@example.com", "hex")

console.log(hash)
// b66c08266792b490d2a3d8221b8eeb73
```

------------------------------------------------------------------------

## BigInt output

``` javascript
const hash = getSubjectHash("email:user@example.com", "bigint")

console.log(hash)
// 242480428595577766886520952605903874931n
```

------------------------------------------------------------------------

# Output formats

  --------------------------------------------------------------------------------------------
  Format                  Length                  Example
  ----------------------- ----------------------- --------------------------------------------
  base64url               22 chars                `tmwIJmeStJDSo9giG47rcw`

  hex                     32 chars                `b66c08266792b490d2a3d8221b8eeb73`

  bigint                  128-bit integer         `242480428595577766886520952605903874931n`
  --------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# CLI

The package includes a CLI for quick lookups:

``` bash
subject-hash email:user@example.com
# tmwIJmeStJDSo9giG47rcw

subject-hash --hex email:user@example.com
# b66c08266792b490d2a3d8221b8eeb73

subject-hash --bigint email:user@example.com
# 242480428595577766886520952605903874931

subject-hash --json email:user@example.com
# {"subject":"email:user@example.com","format":"base64url","hash":"tmwIJmeStJDSo9giG47rcw"}
```

Reads from stdin when piped:

``` bash
echo email:user@example.com | subject-hash
# tmwIJmeStJDSo9giG47rcw
```

Or run via npx without installing:

``` bash
npx @kudos-protocol/subject-hash email:user@example.com
```

------------------------------------------------------------------------

# Normalization

The library performs **minimal normalization**:

    subject = String(subject).trim()

No other canonicalization is applied.

For example:

    email:Matt@example.com
    email:matt@example.com

produce **different hashes**.

Systems that require canonicalization (for example email case
normalization) should perform it **before hashing**.

------------------------------------------------------------------------

# See Also

- [Kudos](https://www.kudos.community)
- [In a Moon](https://www.inamoon.com)
- [Lorem Labs](https://www.loremlabs.com)

# License

MIT
