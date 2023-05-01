# Kudos Keys

Kudos Keys is a library that provides a set of functions to generate and manage keys for the Kudos ecosystem.

Generally you won't need to use this directly but it's used as part of other [@kudos-protocol](https://www.npmjs.com/search?q=%40kudos-protocol) libraries.

## Usage

```javascript

import { hexToBytes, signMessage, getKeys, normalizePrivateKey, validate } from '@kudos-protocol/keys';

// signature = '0x' + signature + recId // recId is last byte of signature
const isValid = await validate({ signature, message, { address } });

// loop through 'WALLET_SEED_' to read in keys for an address.
// WALLET_SEED_0 = walletAddress:publicKey:privateKey
const walletKeys = getKeys(address); // only use this on dev / trusted environments

```

## Logging

Set the `LOG_LEVEL=debug` environment variable to see debug logs.

Uses [@kudos-protocol/logger](https://www.npmjs.com/package/@kudos-protocol/logger).
