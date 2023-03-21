import { currentLedger, disconnect } from '$lib/xrpl.js';

import { Redis } from '@upstash/redis';
import { getIngressAddresses } from '$lib/configured.js';
import log from '$lib/logging';
// import { shortAddress } from '$lib/utils/escrow.js';
import { verifyQueueRequest } from '$lib/queue.js';
import { v4 as uuid } from 'uuid';

let redis = {};
try {
	redis = new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN
	});
} catch (e) {
	log.error('Redis connect error', e);
	process.exit(1);
}

// onEscrowFinish fires from a ledger event, once the escrow is fulfilled (not cancelled)
const onEscrowFinish = async ({ request }) => {
	const startTs = Date.now();

	let params;
	try {
		params = await verifyQueueRequest({ request });
	} catch (e) {
		return new Response(JSON.stringify({ status: { message: e.message, code: 401 } }), {
			status: 401
		});
	}

	const { tx } = params;

	const qp = new URL(request.url).searchParams;
	const NETWORK = qp.get('network').replace(/-/g, ':'); // ?network=xrpl-testnet

	if (!NETWORK) {
		return new Response(JSON.stringify({ status: { message: 'missing network', code: 400 } }), {
			status: 400
		});
	}

	log.info('onEscrowFinish', params);
	// tx: {
	// 	"Account": "rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3",
	// 	"Condition": "A0258020C47F82B21A6BF0712C777F68E60DF8D10593F4EE5C68A4A28D0B54460814FAF5810120",
	// 	"Fee": "380",
	// 	"Flags": 0,
	// 	"Fulfillment": "A0228020C1F7C15F980531B8348B670D8E9D133FB78B1154808CEF7B537A444759A477B3",
	// 	"LastLedgerSequence": 36338561,
	// 	"OfferSequence": 36124812,
	// 	"Owner": "rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3",
	// 	"Sequence": 36124511,
	// 	"SigningPubKey": "02FF4B735099A5CDAB387201E7B67092132D38B07E1F3C04A8FE1FA1C223ECD913",
	// 	"TransactionType": "EscrowFinish",
	// 	"TxnSignature": "304402201A06FFD16857F15576C6E8F82CBBBDC9587207F48C81CA0AE3E889EDF3718F8D022059CAD53B0F7A6CE6665BDF04CBF8D6D58D40F4BCE0FD837E5CE2D8C8741AAFD3",
	// 	"date": 732725870,
	// 	"hash": "2192E1951E518B94B333B537BE7A22CF0A1B5C48C858BB41D7D86DF95956EAB8",
	// 	"inLedger": 36338543,
	// 	"ledger_index": 36338543
	//   }

	// check if the current ledger version is 6 + ahead of this transaction
	// if not, then we need to wait for the ledger to close
	// if so, then we can proceed
	const currentLedgerVersion = await currentLedger(NETWORK);
	if (currentLedgerVersion < tx.LastLedgerSequence + 6) {
		// fail to retry
		log.debug('ledger not closed', currentLedgerVersion, tx.LastLedgerSequence + 6);
		return new Response(JSON.stringify({ status: { message: 'ledger not closed', code: 500 } }), {
			status: 500
		});
	}

	// our queue deduplicates at the ingress, so theoretically we should never get a duplicate, but we'll lock
	// anyway to prevent failure-retries from causing a double-fulfillment. TODO: look into how the redis lock
	// is implemented to make sure it works with distributed architectures (see Redlock)
	const lockKey = `relay:${NETWORK}:${tx.hash}`;
	let lock = await redis.get(lockKey);
	const lockId = uuid();
	if (!lock) {
		await redis.set(
			lockKey,
			{
				exp: Date.now() + 1000 * 60 * 5,
				id: lockId
			},
			{
				nx: true
			}
		);
		const setLock = await redis.get(lockKey); // TODO: assuming this "client" can read its own writes
		if (setLock.id !== lockId) {
			log.debug('unable to set lock', lockKey);
			return new Response(JSON.stringify({ status: { message: 'locked', code: 503 } }), {
				status: 503
			});
		}

		// assuming we have the lock here
	} else {
		log.debug('lock exists', lockKey);

		// if the lock is expired, then we can try to take it
		if (lock.exp < Date.now()) {
			// lock is expired...
			log.debug('lock expired, taking it', lockKey);
			await redis.set(lockKey, {
				exp: Date.now() + 1000 * 60 * 5,
				id: lockId
			});
			const setLock = await redis.get(lockKey); // TODO: assuming this "client" can read its own writes
			if (setLock.id !== lockId) {
				log.debug('unable to set new lock', lockKey);
				return new Response(JSON.stringify({ status: { message: 'locked', code: 503 } }), {
					status: 503
				});
			}
		} else {
			return new Response(JSON.stringify({ status: { message: 'locked', code: 500 } }), {
				status: 500
			});
		}
	}

	// we should have a lock here. Let's look up the identifier for this transaction
	const knownEscrowData = await redis.get(`escrow:${NETWORK}:${tx.hash}`);
	const payViaKey = `u:${tx.Account}:${tx.}`;

	try {
		await disconnect(NETWORK); // so the process hangs up
	} catch (e) {
		log.error('disconnect error', e);
	}

	// return a response object
	return new Response(JSON.stringify({ status: { message: 'tktk', code: 500 } }), {
		status: 500
		// headers: {
		// }
	});
};

const cors = async () => {
	return new Response('', {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '600',

			'Cache-Control': 'max-age=60'
		}
	});
};

export { onEscrowFinish as POST, cors as OPTIONS };
