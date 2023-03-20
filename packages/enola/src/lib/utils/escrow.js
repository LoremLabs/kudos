// shortAddress: only show the first 4 and last 5 characters of an address
export const shortAddress = function (address) {
	// shortAddress(rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3) -> rhDE.3NAs3
	return address.substring(0, 4) + '.' + address.substring(address.length - 5, address.length);
};

export const getPayViaForNetwork = (payVias, network) => {
	// given an array of payVias, return the first one that matches the network
	return payVias.find((p) => p.type === network);
};
