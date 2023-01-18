import { resolvers as scalarResolvers, typeDefs as scalarTypeDefs } from 'graphql-scalars';

import Base from './schema/base.gql';
import CryptographySchema from './schema/cryptography.gql';
import KudosSchema from './schema/kudos.gql';
import MoneySchema from './schema/money.gql';
import Resolvers from './resolvers';
import SortSchema from './schema/sort.gql';
import TempSchema from './schema/temp.gql';
import UserSchema from './schema/user.gql';
import VerifiableCredentials from './schema/verifiable-credentials.gql';

// The GraphQL schema in string form
const typeDefs = [
	...scalarTypeDefs,
	UserSchema,
	MoneySchema,
	KudosSchema,
	TempSchema,
	SortSchema,
	CryptographySchema,
	VerifiableCredentials,
	Base
];

// A map of functions which return data for the schema.
const resolvers = {
    ...scalarResolvers,
	Query: {
		...Resolvers
	}
};

export { typeDefs, resolvers };
