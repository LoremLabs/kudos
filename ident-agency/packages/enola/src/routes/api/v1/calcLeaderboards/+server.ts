import { calculateQf } from '@loremlabs/quadratic-funding';
import log from '@kudos-protocol/logging';
import { redis } from '$lib/redis.js';

const calcLeaderboards = async () => {
	// see if we need to calculate the leaderboards at all
	const lastAdded = await redis.get('kudos-added');
	if (!lastAdded) {
		return new Response(JSON.stringify({ message: 'Nothing new.' }), {
			status: 200,
			headers: {
				'access-control-allow-origin': '*',
				'content-type': 'application/json'
			}
		});
	}

	// TODO: assuming we don't need cache-stampede / lock, etc, but could add here if needed

	// get all from the set "subjects" in redis, loop through them, and calculate the leaderboards, putting back into redis
	const subjects = await redis.smembers('subjects');

	// we ultimately need to build up this structure
	// const projects = [
	// 	{
	// 	  identifier: "kudos-for-code",
	// 	  contributions: [
	// 		{
	// 		  amount: 100,
	// 		},
	// 	  ],
	// 	},

	for (const subject of subjects) {
		const contributors = {}; // key is address, value is array of contributions (weight)
		// for all addresses in subject, add to our dataStructure
		const addresses = await redis.smembers(`a:${subject}`);

		for (const address of addresses) {
			// 			promises.push(redis.hmset(`d:${subject}:${signerAddress}`, id, JSON.stringify([identifier, weight])));));
			// 			addressStateChange[kudosData.id] = JSON.stringify([kudosData.identifier, kudosData.weight]);

			// get all the contributions for this subject and address
			const contributions = await redis.hgetall(`d:${subject}:${address}`);
			for (const contribution of Object.values(contributions)) {
				try {
					const contributionData = contribution; // JSON.parse(contribution);
					const identifier = contributionData[0];
					const amount = contributionData[1];

					if (!contributors[identifier]) {
						contributors[identifier] = [];
					}
					contributors[identifier].push({ amount });
				} catch (e) {
					// skipping
					log.error('Error parsing contribution', e);
				}
			}
		}

		const projects = [];
		for (const [identifier, contributions] of Object.entries(contributors)) {
			projects.push({
				identifier,
				contributions,
				match: 0 // this will be calculated later
			});
		}

		// now we have the data structure, we can calculate the leaderboards
		const MATCHING_AMOUNT = 1_000_000;
		log.debug('projects', JSON.stringify(projects, null, 2));
		const leaderboard = calculateQf(projects, MATCHING_AMOUNT);
		// now we need to put the leaderboards back into redis
		log.debug('leaderboard', leaderboard);

		const tmpLeaderboardName = `l:${subject}:${Date.now()}`;

		const toAdd = [];
		for (const project of leaderboard.projects) {
			// get the match to be the score
			let score = project.match;
			// make the score an integer
			score = Math.round(score);

			// get the identifier to be the value
			const member = project.identifier;
			toAdd.push({ score, member });
		}
		log.debug('toAdd', toAdd);
		try {
			await redis.zadd(tmpLeaderboardName, ...toAdd);
			await redis.rename(tmpLeaderboardName, `l:${subject}`); // replace the old leaderboard with the new one
		} catch (e) {
			log.error('Error adding to leaderboard', e);
			return new Response(JSON.stringify({ message: e.message, code: 500 }), {
				status: 500
				// headers: {
				// }
			});
		}
	}

	await redis.del('kudos-added'); // reset, so we don't calculate again too soon

	// return a response object
	return new Response(JSON.stringify({ status: { message: 'ok', code: 200 } }), {
		status: 200
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

export { calcLeaderboards as GET, cors as OPTIONS };
