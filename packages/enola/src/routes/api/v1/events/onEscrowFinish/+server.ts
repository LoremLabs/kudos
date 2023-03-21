import { MINIMUM_PAYMENT_AMOUNT, calculateFeeForEscrow } from '$lib/businessLogic.js';
import { currentLedger, disconnect, getEscrowIdFromMemos, sendEscrowedPayment } from '$lib/xrpl.js';

import { Client as Qstash } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
//import { getIngressAddresses } from '$lib/configured.js';
import log from '$lib/logging';
import { v4 as uuid } from 'uuid';
// import { shortAddress } from '$lib/utils/escrow.js';
import { verifyQueueRequest } from '$lib/queue.js';

const qstash = new Qstash({
	token: process.env.QSTASH_TOKEN
});

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
	// 	"Condition": "A0258020464AC9CF4C22F43058E90365DBD5A10582896DD4566DE5ED63162EB703471BDF810120",
	// 	"Fee": "380",
	// 	"Flags": 0,
	// 	"Fulfillment": "A0228020822A84DC038BF56EB492195EB1A50BC12B6986B4D95E0E343828FF250F024DEA",
	// 	"LastLedgerSequence": 36344801,
	// 	"Memos": [
	// 	  {
	// 		"Memo": {
	// 		  "MemoData": "37344235464541343630393445463444414144393139373637453138433039303146333145323439423441454332453834313936384233324446413034393334",
	// 		  "MemoFormat": "746578742F706C61696E",
	// 		  "MemoType": "72656C6179746F2E6964"
	// 		}
	// 	  }
	// 	],
	// 	"OfferSequence": 36124819,
	// 	"Owner": "r4bqzg7iZFBGmLyYRa3o6vgtCMDzvVoRCh",
	// 	"Sequence": 36124515,
	// 	"SigningPubKey": "02FF4B735099A5CDAB387201E7B67092132D38B07E1F3C04A8FE1FA1C223ECD913",
	// 	"TransactionType": "EscrowFinish",
	// 	"TxnSignature": "304402202416EA3214DDFD9189EDB8F5F6979CEB6E42BFEC6EDB04EFDBE565AE3D08454F02201F2DFAAE9EB17C4038F2B1F9746FA6CCD0E05ABE14BB8209D28842E55C355404",
	// 	"date": 732745502,
	// 	"hash": "5B8C2ECDF3EE5A9447C14D8C4BE6BCF02FEE0FE132D5D88D4F0ABA2AE40A642B",
	// 	"inLedger": 36344783,
	// 	"ledger_index": 36344783
	//   }

	// check if the current ledger version is 6 + ahead of this transaction
	// if not, then we need to wait for the ledger to close
	// if so, then we can proceed
	const currentLedgerVersion = await currentLedger(NETWORK);
	if (currentLedgerVersion < tx.LastLedgerSequence + 6) {
		// fail to retry
		log.debug('ledger not closed', currentLedgerVersion, tx.LastLedgerSequence + 6);
		await disconnect(NETWORK); // so the process hangs up
		return new Response(JSON.stringify({ status: { message: 'ledger not closed', code: 500 } }), {
			status: 500
		});
	}

	let code = 200;
	let message = 'success';

	const lockKey = `relay:${NETWORK}:${tx.hash}`;
	let escrowId;

	try {
		// our queue deduplicates at the ingress, so theoretically we should never get a duplicate, but we'll lock
		// anyway to prevent failure-retries from causing a double-fulfillment. TODO: look into how the redis lock
		// is implemented to make sure it works with distributed architectures (see Redlock)
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
				throw new Error('locked');
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
					throw new Error('locked');
				}
			} else {
				throw new Error('locked');
			}
		}

		// we should have a lock here. Let's look up the escrowId from the Memo
		try {
			const memoData = getEscrowIdFromMemos({ memos: tx.Memos }); // could throw if no escrowId found
			escrowId = memoData.escrowId;
		} catch (e) {
			log.info('no escrowId found in memo', e.message);
		}
		if (!escrowId) {
			log.info('no escrowId found in memo', tx.Memos);
			throw new Error('no escrowId found in memo');
		}

		const knownEscrowData = await redis.get(`escrow:${escrowId}`);
		const identifierKey = `u:${knownEscrowData.identifier}`;
		const viablePaymentMethods = await redis.hget(identifierKey, 'payVia'); // array of [type, value]

		let toPayAddress;
		// see if we have a payment method for this network
		for (let i = 0; i < viablePaymentMethods.length; i = i + 2) {
			const net = viablePaymentMethods[i];
			const addr = viablePaymentMethods[i + 1];
			if (net === NETWORK) {
				// we have a payment method for this network
				toPayAddress = addr;
				break;
			}
		}

		if (!toPayAddress) {
			// shouldn't happen because we only fulfill when we have one, but maybe user deleted it?
			log.info('no payment method for this network', NETWORK);
			throw new Error('no payment method for this network');
		}

		// we have a payment method for this network, so let's try to pay it
		// we will calcuate our fee
		let fee, toPay;
		try {
			const divvy = await calculateFeeForEscrow({ ...knownEscrowData, feesPaid: tx.Fee });
			fee = divvy.fee;
			toPay = divvy.amount; // in drops string
		} catch (e) {
			log.error('calculateFeeForEscrow error', e);
			throw new Error('calculateFeeForEscrow error');
		}

		// TODO: handle this better, what happens to this dust? It should move to a dust account periodically for payout?
		// validate that the amount is over the minimum, if not error
		if (Number(toPay) < MINIMUM_PAYMENT_AMOUNT) {
			log.info('amount is too small', toPay, MINIMUM_PAYMENT_AMOUNT, escrowId);
			throw new Error('amount is too small');
		}

		// attempt to pay the escrow
		let results;
		try {
			results = await sendEscrowedPayment({
				amount: toPay,
				network: NETWORK,
				address: knownEscrowData.viaAddress, // wallet address
				destination: toPayAddress, // destination address
				escrowId,
				identifier: knownEscrowData.identifier
			});
		} catch (e) {
			log.error('sendEscrowedPayment error', e);
			throw new Error('sendEscrowedPayment error');
		}

		// see if we were successful tesSUCCESS
		if (results.result.meta.TransactionResult !== 'tesSUCCESS') {
			log.info(
				'sendEscrowedPayment failed',
				results.result.meta.TransactionResult,
				escrowId,
				results.tx.hash
			);
			throw new Error(`sendEscrowedPayment failed ${results.result.meta.TransactionResult}`);
		}

		log.info('sendEscrowedPayment done');
		log.info(escrowId, results.result.hash, results.result.meta.TransactionResult);

		// remove the pending member for this escrowId / identifier if we got this far.
		await redis.zrem(`pending:${knownEscrowData.identifier}`, escrowId);

		log.info('removed pending member', escrowId);

		// record what we've done
		// send a onEscrowFinishedFinalized event
		await qstash.publishJSON({
			topic: `${NETWORK.replace(':', '-')}.onEscrowFinishedFinalized`,
			deduplicationId: results.result.hash, // if we somehow pay twice, this will produce multiple events, but that's ok
			body: {
				escrowId,
				amount: toPay,
				fee,
				identifier: knownEscrowData.identifier,
				sourceAddress: knownEscrowData.address,
				viaAddress: knownEscrowData.viaAddress,
				destination: toPayAddress,
				network: NETWORK,
				txHash: results.result.hash,
				txLedger: results.result.ledger_index,
				txDate: results.result.date,
				txResult: results.result.meta.TransactionResult
			}
		});
	} catch (e) {
		log.info('non-standard end', e.message);

		if (e.message === 'locked') {
			code = 503;
			message = e.message;
		} else if (e.message === 'amount is too small') {
			code = 202;
			message = e.message;
		} else {
			code = 500;
			message = e.message;
		}
	} finally {
		try {
			await redis.del(lockKey);
			await disconnect(NETWORK); // so the process hangs up
		} catch (ee) {
			log.info('disconnect error', ee);
		}

		// return a response object
		return new Response(JSON.stringify({ status: { message, code } }), {
			status: code
			// headers: {
			// }
		});
	}
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
