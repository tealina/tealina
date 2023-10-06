import { z } from 'zod'

const schame = z.object({
  PORT: z
    .string()
    .regex(/^\d*$/, 'PORT should be number format')
    .refine(v => {
      const num = Number(v)
      return num > 0 && num < 65536
    }, 'PORT should be in range 0-65536'),
})

schame.parse(process.env)

type CustomEnv = z.infer<typeof schame>

declare global {
  module NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
