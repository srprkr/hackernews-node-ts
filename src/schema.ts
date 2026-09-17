import { createSchema } from "graphql-yoga";
import type { Link, Comment } from "@prisma/client";
import { GraphQLContext } from "./context.js";
import { GraphQLError } from "graphql";
import { Prisma } from '@prisma/client';

const parseIntSafe = (value: string): number | null => {
  if (/^(\d+)$/.test(value)) {
    return parseInt(value, 10)
  }
  return null;
}

const MAX_URL_LENGTH = 2048;

// Accepts bare hosts like "www.prisma.io" as well as full URLs, and rejects
// anything that isn't http(s) -- notably `javascript:` and `data:` URLs.
const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > MAX_URL_LENGTH) {
    return null;
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  if (!URL.canParse(candidate)) {
    return null;
  }

  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.hostname === "") {
    return null;
  }

  return parsed.toString();
};

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
      const url = normalizeUrl(args.url);
      if (url === null) {
        return Promise.reject(
          new GraphQLError(`Cannot post link with invalid url '${args.url}'.`)
        );
      }

      return context.prisma.link.create({
        data: { url, description: args.description },
      });
    },
    async postCommentOnLink(
      parent: unknown,
      args: { linkId: string; body: string; },
      context: GraphQLContext,
    ) {
      const linkId = parseIntSafe(args.linkId)
      if (linkId == null) {
        return Promise.reject(
          new GraphQLError(`Cannot post comment on non-existing link with id '${args.linkId}'.`)
        )
      }

      if (args.body.trim() === "") {
        return Promise.reject(
          new GraphQLError(
            `Cannot post an empty comment.`
          )
        )
      }

      return context.prisma.comment
        .create({ data: { body: args.body, linkId } })
        .catch(( err: unknown ) => {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2003"
          ) {
            return Promise.reject(
              new GraphQLError(`Cannot post comment on non-existing link with id '${args.linkId}'.`)
            );
          }
          return Promise.reject(err);
      });
    },
  },
};

export const schema = createSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
});
