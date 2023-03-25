import { resolvers as scalarResolvers, typeDefs as scalarTypeDefs } from 'graphql-scalars';

import MutationSchema from './schema/mutation.gql';
import Mutations from './mutations';
import PaymentMethodSchema from './schema/payment-method.gql';
import QuerySchema from './schema/query.gql';
import Resolvers from './resolvers';

// import TempSchema from './schema/temp.gql';

// The GraphQL schema in string form
const typeDefs = [...scalarTypeDefs, PaymentMethodSchema, QuerySchema, MutationSchema];

// A map of functions which return data for the schema.
const resolvers = {
	...scalarResolvers,
	Query: {
		...Resolvers
	},
	Mutation: {
		...Mutations
	}
};

export { typeDefs, resolvers };
