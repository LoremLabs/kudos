import DateTimeSchema from './schema/datetime.gql';
import MoneySchema from './schema/money.gql';
import TempSchema from './schema/temp.gql';
import TypesSchema from './schema/types.gql';
import UserSchema from './schema/user.gql';
import casual from 'casual';

// The GraphQL schema in string form
const typeDefs = [DateTimeSchema, UserSchema, TypesSchema, MoneySchema, TempSchema];

// A map of functions which return data for the schema.
const resolvers = {
	Query: {
		sayHello: () => {
			return {
				name: casual.name,
				age: casual.integer(10, 100)
			};
		}
	}
};

export { typeDefs, resolvers };
