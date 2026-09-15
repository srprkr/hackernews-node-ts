import "dotenv/config"

// 1
// after (Prisma 7)
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// 2
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// 3
async function main() {
  const allLinks = await prisma.link.findMany()
  console.log(allLinks)
}

const newLink = await prisma.link.create({
  data: {
    description: 'Fullstack tutorial for GraphQL',
    url: 'www.howtographql.com'
  }
})

// 4
main()
  // 5
  .finally(async () => {
    await prisma.$disconnect()
  })

  