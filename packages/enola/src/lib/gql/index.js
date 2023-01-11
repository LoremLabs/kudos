import casual from 'casual';
import gql from 'graphql-tag';

// read the graphql schema from files
// const { readFileSync } = require('fs');
// const { join } = require('path');
// const { makeExecutableSchema } = require('graphql-tools');
//
// const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf8');
// const resolvers = require('./resolvers');
//
// const schema = makeExecutableSchema({ typeDefs, resolvers });


// The GraphQL schema in string form
const typeDefs = gql`
	type Query {
		sayHello: String
	}
`;

// A map of functions which return data for the schema.
const resolvers = {
	Query: {
		sayHello: () => casual.name
	}
};

export { typeDefs, resolvers };
