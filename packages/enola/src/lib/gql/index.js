import Base from './schema/base.gql';
import DateTimeSchema from './schema/datetime.gql';
import KudosSchema from './schema/kudos.gql';
import MoneySchema from './schema/money.gql';
import Resolvers from './resolvers';
import TempSchema from './schema/temp.gql';
import TypesSchema from './schema/types.gql';
import UserSchema from './schema/user.gql';

// The GraphQL schema in string form
const typeDefs = [DateTimeSchema, UserSchema, TypesSchema, MoneySchema, KudosSchema, TempSchema];

// A map of functions which return data for the schema.
const resolvers = {
	Query: {
        ...Resolvers,
	}
};

export { typeDefs, resolvers };
