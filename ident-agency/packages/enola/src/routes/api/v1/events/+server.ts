import { Client as Qstash } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import { getClient } from '$lib/xrpl.js';
import { getIngressAddresses } from '$lib/configured.js';
import log from '$lib/logging';

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

const qstash = new Qstash({
	token: process.env.QSTASH_TOKEN
});

const MAX_RUNTIME = process.env.WATCHER_RUNTIME || 1000 * 55; // 55s to have a chance to finish
const TX_LIMIT = parseInt(process.env.WATCHER_LIMIT, 10) || 100;

const ledgerWatcher = async ({ request }) => {
	const startTs = Date.now();

	// get the key from the params
	const params = new URL(request.url).searchParams;
	const key = params.get('key');

	// check if the key is valid
	if (key !== process.env.LEDGER_WATCHER_KEY) {
		return new Response(JSON.stringify({ status: { message: 'forbidden', code: 401 } }), {
			status: 401
		});
	}

	// get the network
	const network = params.get('network');
	if (!network) {
		return new Response(JSON.stringify({ status: { message: 'missing network', code: 400 } }), {
			status: 400
		});
	}

	// get matching addresses
	const addresses = getIngressAddresses(network);
	if (!addresses) {
		return new Response(JSON.stringify({ status: { message: 'invalid network', code: 400 } }), {
			status: 400
		});
	}

	// connect our client
	const xrplClient = await getClient(network);

	// make sure we're connected
	await xrplClient.connect();

	// get the last processed ledger index stored in redis
	const lastLedgerIndex = {};
	for (const address of [...addresses]) {
		lastLedgerIndex[address] = await redis.get(`lw:${network}:${address}:lastIndex`);
		lastLedgerIndex[address] = parseInt(lastLedgerIndex[address], 10);
		if (!lastLedgerIndex[address]) {
			lastLedgerIndex[address] = -1;
		}
		lastLedgerIndex[address] = lastLedgerIndex[address] + 1; // start with the next index
	}

	let loop = true;
	try {
		while (loop) {
			let limitReached = false;
			let accountInfo = {};

			for (const address of [...addresses]) {
				let lastLedgerIndexProcessed = 0;

				// get the account info
				log.info(`ledgerWatcher: checking ${address} on ${network}...`);
				accountInfo = await xrplClient.request({
					command: 'account_info',
					account: address,
					ledger_index: 'validated'
				});

				log.debug(
					`ledgerWatcher: account_info for ${address} on ${network} after ${lastLedgerIndex[address]}`,
					accountInfo
				);
				// check if we have a new ledger
				if (accountInfo.result.ledger_index > lastLedgerIndex[address]) {
					// get the transactions
					const transactionsResponse = await xrplClient.request({
						command: 'account_tx',
						account: address,
						ledger_index_min: lastLedgerIndex[address],
						ledger_index_max: -1,
						binary: false,
						limit: TX_LIMIT
					});
					const { result: transactions } = transactionsResponse;

					lastLedgerIndexProcessed = lastLedgerIndex[address];

					log.debug(
						`ledgerWatcher: account_tx lastLedgerIndexProcessed: ${lastLedgerIndexProcessed}`,
						transactions
					);
					// process the transactions
					for (const tx of transactions.transactions) {
						log.debug(`ledgerWatcher: processing ${tx.tx.TransactionType}`, tx);
						// look to see if this has been validated
						if (tx.validated === false) {
							// shouldn't happen because we are using validated ledger
							throw new Error('transaction not validated');
						}
						log.debug(
							`lastLedgerIndexProcessed ${lastLedgerIndexProcessed} vs ${tx.tx.ledger_index} vs ${lastLedgerIndex[address]}`
						);
						if (lastLedgerIndexProcessed < tx.tx.ledger_index) {
							lastLedgerIndexProcessed = tx.tx.ledger_index;
						}
						switch (tx.tx.TransactionType) {
							case 'EscrowCreate': {
								// relay to queue
								if (tx.tx.Destination !== address) {
									// not for us? should not happen
									log.warn(
										`ledgerWatcher: EscrowCreate for ${tx.tx.Destination} not for us ${address}`,
										tx.tx
									);
									continue;
								}

								log.debug(
									`ledgerWatcher: publishing EscrowCreate for ${address} on ${network}`,
									tx.tx
								);
								const res = await qstash.publishJSON({
									topic: `${network.replace(':', '-')}.onEscrowCreate`,
									deduplicationId: tx.tx.hash,
									body: {
										tx: tx.tx
									}
								});
								break;
							}
							case 'EscrowFinish': {
								// relay to queue
								if (tx.tx.Account !== address) {
									// not for us? should not happen
									log.warn(
										`ledgerWatcher: EscrowFinish for ${tx.tx.Account} not for us ${address}`,
										tx.tx
									);
									continue;
								}

								log.debug(
									`ledgerWatcher: publishing EscrowFinish for ${address} on ${network}`,
									tx.tx
								);

								const res = await qstash.publishJSON({
									topic: `${network.replace(':', '-')}.onEscrowFinish`,
									deduplicationId: tx.tx.hash,
									body: {
										tx: tx.tx
									}
								});
								break;
							}
							case 'EscrowCancel': {
								// relay to queue
								log.debug(
									`ledgerWatcher: publishing EscrowCancel for ${address} on ${network}`,
									tx.tx
								);
								if (tx.tx.Account !== address) {
									// not for us? should not happen
									log.warn(
										`ledgerWatcher: EscrowCancel for ${address} on ${network} not for us`,
										tx.tx
									);
									continue;
								}

								const res = await qstash.publishJSON({
									topic: `${network.replace(':', '-')}.onEscrowCancel`,
									deduplicationId: tx.tx.hash,
									body: {
										tx: tx.tx
									}
								});
								break;
							}
							default: {
								// ignore
								break;
							}
						}
					}

					// see if we read a full page
					if (transactions.transactions.length >= TX_LIMIT) {
						log.info(`ledgerWatcher: limit reached for ${address} on ${network}...`);
						limitReached = true;
					}

					// if we processed no transactions then we should record the index anyway
					if (transactions.transactions.length === 0) {
						log.info(`ledgerWatcher: no new transactions for ${address} on ${network}...`);
						lastLedgerIndexProcessed = accountInfo.result.ledger_index;
					}
				}

				// update the last ledger index if needed
				if (lastLedgerIndexProcessed > lastLedgerIndex[address]) {
					lastLedgerIndex[address] = lastLedgerIndexProcessed;
					log.info(
						`ledgerWatcher: updating last index for ${address} on ${network} to ${lastLedgerIndex[address]}`
					);
					await redis.set(`lw:${network}:${address}:lastIndex`, lastLedgerIndex[address]);
				}

				// check if we are over the max runtime
				if (Date.now() - startTs > MAX_RUNTIME) {
					loop = false;
					log.info(`ledgerWatcher: max runtime reached for ${address} on ${network}.`);
					break;
				}

				if (limitReached) {
					// sleep for pauseTime
					const pauseTime = 1000 * 5; // 5s
					await new Promise((resolve) => setTimeout(resolve, 1000));
				} else {
					loop = false; // we read all transactions, no need to loop
				}
			}
		}
	} catch (e) {
		log.error('ledgerWatcher error', e);
		return new Response(JSON.stringify({ status: { message: 'error', code: 500 } }), {
			status: 500
		});
	}

	await xrplClient.disconnect();

	return new Response(JSON.stringify({ status: { message: 'ok', code: 200 } }), {
		status: 200
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

export { ledgerWatcher as GET, cors as OPTIONS };
