import { Redis } from '@upstash/redis';
// import casual from 'casual';
import { currentCohort } from '$lib/utils/date';
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

// socialPay is like payVia, but it returns escrow information if available
export const socialPay = async (_, params) => {
	// return {

	// 	status: {
	// 		code: 2000,
	// 		message: 'ok?'
	// 	},
	// 	paymentMethods: [
	// 		{
	// 			type: 'xrpl:testnet',
	// 			value: 'rabc'
	// 		}
	// 	],
	// 	escrowMethods: [
	// 		{
	// 			type: 'xrpl:testnet',
	// 			account: 'rxyz',
	// 			time: 86400 * 7 // 7 days
	// 		}]
	// };

	const identifier = params.identifier.toLowerCase().trim();

	// make sure it's not too big of input
	if (identifier.length > 2000) {
		throw new Error('Identifier too long');
	}

	let result = {
		status: {
			message: 'error',
			code: 500
		}
	};

	const data = await redis.hget(`u:${identifier}`, 'payVia');
	if (data) {
		//		const data = JSON.parse(payload);
		result = {
			...result,
			paymentMethods: [
				{
					type: data[0],
					value: data[1]
				}
			]
		};
	} else {
		result = { ...result, paymentMethods: [] };
	}

	// see if this id is escrowable
	// for now they all are
	const escrowMethods = [
		{
			type: 'xrpl:testnet',
			account: 'rG4fmQf9X2VFWiE63GerPouKfVuE4LYbJn',
			time: 86400 * 7 // 7 days
		}
		// {
		// 	type: 'xrpl:livenet',
		// 	value: '',
		// 	time: 86400 * 7 // 7 days
		// },
	];
	result = {
		...result,
		escrowMethods: escrowMethods,
		status: {
			message: 'ok',
			code: 200
		}
	};

	return result;
};

export const payVia = async (_, params) => {
	const identifier = params.identifier.toLowerCase().trim();

	// make sure it's not too big of input
	if (identifier.length > 2000) {
		throw new Error('Identifier too long');
	}

	const data = await redis.hget(`u:${identifier}`, 'payVia');
	if (data) {
		//		const data = JSON.parse(payload);
		return [
			{
				type: data[0],
				value: data[1]
			}
		];
	} else {
		return [];
	}
};

export const leaderBoard = async (_, params) => {
	// log.debug('leaderboard ---------->', params);
	let subject = (params.subject || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]/gi, '');
	if (subject === '') {
		// calculate the current cohort and use that
		subject = currentCohort();
	}
	// make sure subject is not too long
	if (subject.length > 200) {
		return {
			status: {
				message: 'invalid payload',
				code: 400
			}
		};
	}

	const DEFAULT_PAGE_SIZE = 100;
	let start = params.start || 0;
	let pageSize = params.pageSize || DEFAULT_PAGE_SIZE;

	// see if start and pageSize are within bounds
	if (start < 0) {
		start = 0;
	}
	if (pageSize < 1) {
		pageSize = DEFAULT_PAGE_SIZE;
	}

	let end = start + pageSize; // end -1 is all

	// zrange l:202309 0 -1 rev limit 0 100 withscores
	const data = await redis.zrange(`l:${subject}`, 0, -1, {
		rev: true,
		withScores: true,
		offset: start,
		count: pageSize
	}); // highest to lowest; l: is for leaderboard
	const result = [];
	for (let i = 0; i < data.length; i += 2) {
		// comes back as [identifier, score, identifier, score, ...]
		result.push({
			rank: start + i / 2 + 1,
			identifier: data[i],
			score: data[i + 1]
		});
	}

	const answer = {
		status: {
			message: 'ok',
			code: 200
		},
		leaderboard: {
			rows: result,
			subject: subject,
			start: start,
			pageSize: pageSize
		}
	};

	return answer;
};

// export const sayHello = async () => {
// 	const value = await redis.get('test');

// 	await redis.set('test', casual.name);

// 	return {
// 		name: value,
// 		age: casual.integer(10, 100)
// 	};
// };

// export const resolveDid = () => {
// 	return {
// 		name: casual.name,
// 		age: casual.integer(10, 100)
// 	};
// };

export default {
	leaderBoard,
	payVia,
	socialPay
	//	resolveDid
};
