import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

const NODE_ENV = process.env.NODE_ENV ?? 'development'
const envFiles = [
  '.env',
  `.env.${NODE_ENV}`,
  `.env.local`,
  `.env.${NODE_ENV}.local`,
]
config({ path: envFiles })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
