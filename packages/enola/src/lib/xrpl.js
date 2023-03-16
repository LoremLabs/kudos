import xrpl from 'xrpl';

const clients = {};

export const ENDPOINTS = {
	'xrpl:livenet': process.env.XRPL_LIVENET || 'wss://xrplcluster.com',
	'xrpl:testnet': process.env.XRPL_TESTNET || 'wss://testnet.xrpl-labs.com',
	'xrpl:devnet': process.env.XRPL_DEVNET || 'wss://s.devnet.rippletest.net'
};

export const getClient = async function (network) {
	let client = clients[network];
	if (!client) {
		const endpoint = ENDPOINTS[network];
		switch (network) {
			case 'xrpl:testnet':
				client = new xrpl.Client(endpoint);
				break;
			case 'xrpl:livenet':
				client = new xrpl.Client(endpoint);
				break;
			case 'xrpl:devnet':
				client = new xrpl.Client(endpoint);
				break;
			default:
				throw new Error('unknown network: ' + network);
		}
		clients[network] = client;

		// auto-connect
		client.on('error', (err) => {
			console.log(`client [${network}] error`, err.message);
		});

		// client.on('connected', () => {
		// });

		await client.connect();
		return client;
	} else {
		return client;
	}
};
