import { createSchema } from "graphql-yoga";
import type { Link, Comment } from "@prisma/client";
import { GraphQLContext } from "./context.js";

const typeDefinitions = `
  type Query {
    info: String!
    feed: [Link!]!
    link(id: ID!): Link
    comment(id: ID!): Comment
  }

  type Mutation {
    postLink(url: String!, description: String!): Link!
    postCommentOnLink(linkId: ID!, body: String!): Comment!
  }

  type Link {
    id: ID!
    description: String!
    url: String!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    createdAt: String!
    link: Link!
    body: String!
  }
`;

const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    feed: async (parent: unknown, args: {}, context: GraphQLContext) => {
      return context.prisma.link.findMany();
    },
    async comment(
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) {
      return context.prisma.comment.findUnique({
        where: { id: parseInt(args.id) },
      });
    },
    async link(parent: unknown, args: { id: string }, context: GraphQLContext) {
      return context.prisma.link.findUnique({
        where: { id: parseInt(args.id) },
      });
    },
  },
  Comment: {
    link: (parent: Comment, args: {}, context: GraphQLContext) => {
      return context.prisma.link.findUniqueOrThrow({
        where: { id: parent.linkId },
      });
    },
  },
  Link: {
    id: (parent: Link) => parent.id,
    comments: (parent: Link, args: {}, context: GraphQLContext) => {
      return context.prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          linkId: parent.id,
        },
      });
    },
    description: (parent: Link) => parent.description,
    url: (parent: Link) => parent.url,
  },
  Mutation: {
    async postLink(
      parent: unknown,
      args: { description: string; url: string },
      context: GraphQLContext,
    ) {
      const newLink = await context.prisma.link.create({
        data: {
          url: args.url,
          description: args.description,
        },
      });
      return newLink;
    },
    async postCommentOnLink(
      parent: unknown,
      args: {
        linkId: string;
        body: string;
      },
      context: GraphQLContext,
    ) {
      const newComment = await context.prisma.comment.create({
        data: {
          linkId: parseInt(args.linkId),
          body: args.body,
        },
      });

      return newComment;
    },
  },
};

export const schema = createSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
});
