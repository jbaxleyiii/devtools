import { WebApp } from "meteor/webapp";
import { graphqlExpress, graphiqlExpress } from "apollo-server-express";
import bodyParser from "body-parser";
import express from "express";
import { find, filter } from "lodash";
import { makeExecutableSchema } from "graphql-tools";

const typeDefs = `
  type Author {
    id: Int!
    firstName: String
    lastName: String
    posts: [Post] # the list of Posts by this author
  }

  type Post {
    id: Int!
    title: String
    author: Author
    votes: Int
  }

  # the schema allows the following query:
  type Query {
    posts: [Post]
    author(id: Int!): Author
  }

  # this schema allows the following mutation:
  type Mutation {
    upvotePost (
      postId: Int!
    ): Post
  }
`;

const resolvers = {
  Query: {
    posts: () => posts,
    author: (_, { id }) => find(authors, { id: id }),
  },
  Mutation: {
    upvotePost: (_, { postId }) => {
      const post = find(posts, { id: postId });
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      return post;
    },
  },
  Author: {
    posts: author => filter(posts, { authorId: author.id }),
  },
  Post: {
    author: post => find(authors, { id: post.authorId }),
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = express();
server.use(
  "/graphql",
  bodyParser.json(),
  graphqlExpress(req => ({
    schema,
  }))
);

server.use("/graphiql", graphiqlExpress({ endpointURL: "/graphql" }));

WebApp.connectHandlers.use(server);
const authors = [
  { id: 1, firstName: "Tom", lastName: "Coleman" },
  { id: 2, firstName: "Sashko", lastName: "Stubailo" },
  { id: 3, firstName: "Mikhail", lastName: "Novikov" },
];

const posts = [
  { id: 1, authorId: 1, title: "Introduction to GraphQL", votes: 2 },
  { id: 2, authorId: 2, title: "Welcome to Apollo", votes: 3 },
  { id: 3, authorId: 2, title: "Advanced GraphQL", votes: 1 },
  { id: 4, authorId: 3, title: "Launchpad is Cool", votes: 7 },
  { id: 5, authorId: 1, title: "DevTools are Great", votes: 5 },
  { id: 6, authorId: 2, title: "Building OSS", votes: 20 },
  { id: 7, authorId: 3, title: "GraphQL vs REST", votes: 400 },
];
