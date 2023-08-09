# Subject-Hash

## Overview

A Subject-Hash is a domain name friendly lookup key for a _subject_.

### Subject-Hash Algorithm:

1. Hash the subject using SHA256. Ex subject: ` email:foo@bar`` ->  `0d32944fed9d463bc9cc9ce57f6aead12e1c1cb699659b45a1510626c957a408`

2. Split the hash in two parts, the first 32 bytes and the last 32 bytes. Ex: `0d32944fed9d463bc9cc9ce57f6aead1` and `2e1c1cb699659b45a1510626c957a408`

3. For most cases, this is it. To use as a domain name component, concatenate the parts with a `.` to form part of a hierarchy.

4. There are some edge cases, as a host cannot be all numeric. If it is, we add a prefix of the hash algorithm to the start of the part. For instance: `sha256-00000000000000000000000000000000`.

SubjectHashes are used by the [Ident.Agency](https://www.ident.agency) to allow users to lookup information about a subject and for subjects to be able to store information about themselves.

### What's a Subject?

A subject can be a person, organization, thing, data model, abstract entity, etc. It's a generic term for an entity that can be identified.

To make it easier to understand what type of subject it is, we use a prefix. For instance, `email:foo@bar` is an email subject. `twitter:@loremlabs` is a Twitter handle as a subject. `phone:1234567890` is a phone number subject.

Because the subject gets hashed, minor changes to the subject will result in a different hash. For instance, `email:foo@bar` and `email:Foo@bar` will result in different hashes. As such you should apply a normalization to the subject before hashing it. For example when we encounter `email:`` we use lowercase and remove any whitespace.

## Installation

```bash

npm install @kudos-protocol/subject-hash

```

## Usage

```javascript
import { getSubjectSubdomain } from '@kudos-protocol/subject-hash';

async function getHostForSubject(subject) {
	const subdomain = await getSubjectSubdomain(subject);
	const host = `xrpl-mainnet.${subdomain}.ident.domains`;
	return host;
}

async function main() {
	const host = await getHostForSubject('email:foo@bar');
	console.log(host); //  xrpl-mainnet.0d32944fed9d463bc9cc9ce57f6aead1.2e1c1cb699659b45a1510626c957a408.ident.cash
}

main();
```

You can also lookup a subject's `payVia` entry:

```javascript
import { getSubjectPayVia } from './index.js';

async function main() {
	const result = await getSubjectPayVia({
		subject: 'email:foo@bar',
		network: 'xrpl-mainnet',
		domain: 'ident.cash'
	});

	console.log(result.payVia); // rEt8yCY2rcbY94vyGrUDUAiRfea1cncpYU

	// you could use this to send a payment to the subject's xrpl address for instance
}

main();
```

## License

MIT
