import { z } from 'zod'

export const modelIdZ = z.object({
  id: z.coerce.number(),
})

export type ModelIdZ = z.infer<typeof modelIdZ>
