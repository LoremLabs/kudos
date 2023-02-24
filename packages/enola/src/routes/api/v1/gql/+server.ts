import { createSchema, createYoga } from 'graphql-yoga';
import { resolvers, typeDefs } from '$lib/gql';

import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';
import { useGraphQlJit } from '@envelop/graphql-jit';

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
	logging: false, // 'debug', //  logging: 'debug' or false
	schema: createSchema({
		typeDefs,
		resolvers
	}),
	plugins: [
		useGraphQlJit()
		// other plugins: https://www.envelop.dev/plugins
	],
	graphqlEndpoint: '/api/v1/gql',
	renderGraphiQL,
	graphiql,
	fetchAPI: globalThis
});

export { yogaApp as GET, yogaApp as POST };
