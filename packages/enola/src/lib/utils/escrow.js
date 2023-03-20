// shortAddress: only show the first 4 and last 5 characters of an address
export const shortAddress = function (address) {
	// shortAddress(rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3) -> rhDE.3NAs3
	return address.substring(0, 4) + '.' + address.substring(address.length - 5, address.length);
};

export const getPayViaForNetwork = (payVias, network) => {
	// payVias is an array. network, value, network, value, etc. in order of preference
	// so we need to search for the first network that matches
	for (let i = 0; i < payVias.length; i += 2) {
		if (payVias[i] === network) {
			return payVias[i + 1];
		}
	}
};
