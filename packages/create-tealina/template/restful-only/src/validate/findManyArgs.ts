import { z } from 'zod'

export const findManyArgsZ = z
  .object({
    skip: z.coerce.number(),
    take: z.coerce.number(),
    where: z.record(z.any()),
  })
  .partial()

export type FindManyArgsZ = z.infer<typeof findManyArgsZ>
