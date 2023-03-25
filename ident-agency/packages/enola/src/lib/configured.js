export const getIngressAddresses = (network) => {
	const addresses = new Set();
	// process.env.RELAY_MANAGER_SCOPE is a string "xrpl:livenet=rEt8yCY2rcbY94vyGrUDUAiRfea1cncpYU,xrpl:testnet=..."

	// setup our ingress addresses
	(process.env.RELAY_MANAGER_SCOPE || '').split(',').forEach((definition) => {
		if (!definition) {
			return;
		}
		let [net, addr] = definition.split('=');
		// remove whitespace
		net = net.trim();
		addr = addr.trim();

		// change - to : (qstash limit of allowable chars in q names)
		net = net.replace(/-/g, ':');

		if (net === network) {
			addresses.add(addr);
		}
	});

	return addresses;
};
