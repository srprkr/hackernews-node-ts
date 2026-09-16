import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })


export type GraphQLContext = {
  prisma: PrismaClient
}

export async function createContext(): Promise<GraphQLContext> {
  return { prisma }
}