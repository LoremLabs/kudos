import { resolvers as scalarResolvers, typeDefs as scalarTypeDefs } from 'graphql-scalars';

import Base from './schema/base.gql';
// import CryptographySchema from './schema/cryptography.gql';
import KudosSchema from './schema/kudos.gql';
import LeaderBoardSchema from './schema/leaderboard.gql';
import MutationSchema from './schema/mutation.gql';
import Mutations from './mutations';
// import SortSchema from './schema/sort.gql';
import PaymentMethodSchema from './schema/payment-method.gql';
import PoolSchema from './schema/pool.gql';
// import MoneySchema from './schema/money.gql';
import QuerySchema from './schema/query.gql';
import Resolvers from './resolvers';
import SocialPaySchema from './schema/social-pay.gql';

// import TempSchema from './schema/temp.gql';

// import UserSchema from './schema/user.gql';
// import VerifiableCredentials from './schema/verifiable-credentials.gql';

// The GraphQL schema in string form
const typeDefs = [
	...scalarTypeDefs,
	// UserSchema,
	// MoneySchema,
	Base,
	PoolSchema,
	KudosSchema,
	LeaderBoardSchema,
	PaymentMethodSchema,
	QuerySchema,
	MutationSchema,
	SocialPaySchema
	// TempSchema
	// SortSchema,
	// CryptographySchema,
	// VerifiableCredentials,
];

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
