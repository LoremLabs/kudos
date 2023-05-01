# Kudos Short ID

## Overview

This library provides a base58 encoded UUID V1 which is 22 characters long. It's used to create a unique identifier for a Kudos transaction. Under the hood it's the standard UUID V1 which is base58 encoded.

Likely you won't want to use this directly, but it's used as part of other [@kudos-protocol](https://www.npmjs.com/search?q=%40kudos-protocol) libraries.

## Usage

```javascript
import { shortID, shortIdFromUuid, uuidV1 } from '@kudos-protocol/short-id';

console.log(shortID()); // Jr9jnoTosc332G9gjcStZv
```
