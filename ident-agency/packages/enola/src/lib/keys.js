import * as secp256k1 from '@noble/secp256k1';

import { bytesToHex, hexToBytes as hexTo } from '@noble/hashes/utils';

import addressCodec from 'ripple-address-codec';
import hashjs from 'hash.js';
import log from '@kudos-protocol/logging';
import { sha256 } from '@noble/hashes/sha256';

export const hexToBytes = (hex) => {
	// check if it's a hex string, starting with 0x
	if (typeof hex === 'string' && hex.match(/^0x([0-9a-f][0-9a-f])*$/i)) {
		// strip off the 0x
		hex = hex.slice(2);
	}

	return hexTo(hex);
};

export const validate = async (params) => {
	const { signature, message, input } = params;

	// signature = '0x' + signature + recId // recId is last byte of signature
	const sig = signature.slice(0, -1);
	const recId = parseInt(signature.slice(-1), 10);

	function deriveAddressFromBytes(publicKeyBytes) {
		const publicKeyHash = computePublicKeyHash(publicKeyBytes);
		return addressCodec.encodeAccountID(publicKeyHash);
	}

	function computePublicKeyHash(publicKeyBytes) {
		const hash256 = hashjs.sha256().update(publicKeyBytes).digest();
		const hash160 = hashjs.ripemd160().update(hash256).digest();
		return hash160; // was Buffer.from(hash160);
	}

	// log.info(JSON.stringify({ sig, recId, message }));
	let verified = {};
	try {
		const hashedMessage = sha256(message);

		// get the public key from the signature
		const publicKey = bytesToHex(secp256k1.recoverPublicKey(hashedMessage, sig, recId, true));
		const sigAddress = deriveAddressFromBytes(hexToBytes(publicKey));

		// check if message.address matches the address derived from the signature
		if (sigAddress !== input.address && sigAddress !== input.a) {
			throw new Error('Invalid address:' + sigAddress + ' != ' + input.address);
		}

		// verify the signature
		verified = secp256k1.verify(hexToBytes(sig), hashedMessage, hexToBytes(publicKey));

		if (!verified) {
			throw new Error('Invalid signature');
		}
	} catch (e) {
		console.log(e.message);
		throw new Error('Invalid signature');
	}

	log.debug('verified', verified);

	return verified;
};

export const normalizePrivateKey = (privateKey) => {
	if (typeof privateKey === 'string') {
		if (privateKey.length === 66) {
			// remove 00 prefix
			privateKey = privateKey.slice(2);
		}
	}

	return privateKey;
};

export const getKeys = async function (address) {
	// used by processes that only have access to env vars to get keys

	// we iterate through process.env.WALLET_SEED_* and find the one that matches the address. Values are address:data:data2
	// where data is the public key and data2 is the private key

	let found = null;
	for (const key in process.env) {
		if (key.startsWith('WALLET_SEED_')) {
			const keyString = process.env[key];
			const [walletAddress, publicKey, privateKey] = keyString.split(':');

			if (walletAddress === address) {
				found = { walletAddress, publicKey, privateKey: normalizePrivateKey(privateKey) };
				break;
			}
		}
	}

	if (!found) {
		throw new Error(`Wallet seed not found for address: ${address}`);
	}

	return found;
};

export const signMessage = async ({ message, address }) => {
	const hashedMessage = sha256(JSON.stringify(message));
	const { privateKey } = await getKeys(address);

	const [sig, recId] = await secp256k1.sign(hashedMessage, hexToBytes(privateKey), {
		recovered: true
	});

	return `${bytesToHex(sig)}${recId}`;
};
