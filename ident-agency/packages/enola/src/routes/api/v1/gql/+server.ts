import { createSchema, createYoga } from 'graphql-yoga';
import { resolvers, typeDefs } from '$lib/gql';

import type { RequestEvent } from '@sveltejs/kit';
import { UnsecuredJWT } from 'jose';
import { dev } from '$app/environment';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';
import { useGenericAuth } from '@envelop/generic-auth';
import { useGraphQlJit } from '@envelop/graphql-jit';
import { validate } from '$lib/keys';

const resolveUserFn = async (context) => {
	// Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
	// to find the current user.
	// Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
	// Make sure to either return `null` or the user object.

	try {
		// console.log({context});

		const authorization = context.request.headers.get('authorization');
		if (!authorization) {
			return null;
		}
		const token = authorization.replace('Bearer ', '');
		// console.log({token});
		const user = await validateUser(token);
		return user;
	} catch (e) {
		console.error('Failed to validate token', e);

		return null;
	}
};

const validateUser = async (token) => {
	if (!token) {
		return null;
	}

	// get the payload from the token
	const { payload } = UnsecuredJWT.decode(token, {});
	// "payload": {
	// 	"p": "{\"a\":\"r4bqzg7iZFBGmLyYRa3o6vgtCMDzvVoRCh\",\"n\":[\"xrpl:testnet\"],\"t\":[\"kudos:store\"]}",
	// 	"s": "30440220774b8f4fed5c465e117f998303dfe79af8e678163414cebcb6e0f7191046aa8602205abc5860c58848a9298dcd931e49f6f5e8c553dbba31cae73e10af5871a6fd4a",
	// 	"iat": 1681305913,
	// 	"iss": "setler-cli",
	// 	"exp": 1696857913
	//   },

	const { p: message, s: signature } = payload;
	let input = {};
	try {
		input = JSON.parse(message);
	} catch (e) {
		console.error('Failed to parse payload', e);
		return null;
	}

	const validated = await validate({
		signature,
		message, // original stringified payload
		input
	});

	if (!validated) {
		// not a valid token
		return null;
	}

	// get the public key from the payload
	const { a: address } = input;
	if (!address) {
		return null;
	}
	return { ...input };
};

const graphiql =
	!dev && false // TODO: temp disabled
		? false
		: {
				title: 'Enola',
				defaultQuery: `query LookupPayVia {
					payVia(identifier:"did:kudos:email:mankins@gmail.com") {
					  type
					  value
					}
				  }`
		  };

const yogaApp = createYoga<RequestEvent>({
	logging: 'debug', // false, // 'debug', //  logging: 'debug' or false
	schema: createSchema({
		typeDefs,
		resolvers
	}),
	plugins: [
		useGenericAuth({
			resolveUserFn,
			validateUser,
			mode: 'resolve-only'
		}),
		useGraphQlJit()
		// other plugins: https://www.envelop.dev/plugins
	],
	graphqlEndpoint: '/api/v1/gql',
	renderGraphiQL,
	graphiql,
	fetchAPI: globalThis
});

export { yogaApp as GET, yogaApp as POST, yogaApp as OPTIONS };
