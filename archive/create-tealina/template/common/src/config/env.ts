import { z } from 'zod'
import { config } from 'dotenv'

const NODE_ENV = process.env.NODE_ENV ?? 'development'
const envFiles = [
  '.env',
  `.env.${NODE_ENV}`,
  `.env.local`,
  `.env.${NODE_ENV}.local`,
]
config({ path: envFiles })

const schame = z.object({
  PORT: z
    .string()
    .regex(/^\d*$/, 'PORT should be number format')
    .refine(v => {
      const num = Number(v)
      return num > 0 && num < 65536
    }, 'PORT should be in range 0-65536'),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string(),
})

schame.parse(process.env)

type CustomEnv = z.infer<typeof schame>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
