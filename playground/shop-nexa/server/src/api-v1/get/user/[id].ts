import { z } from 'zod'
import type { AuthedHandler } from '../../../../types/handler.js'
import { Pure } from '../../../../types/pure.js'
import { convention } from '../../../convention.js'
import { db } from '../../../db/prisma.js'

const IdSchame = z.object({
  id: z.coerce.number(),
})

/** Get user by id */
const handler: AuthedHandler<{ params: { id: string } }, Pure.User> = async (
  req,
  res,
) => {
  const params = IdSchame.parse(req.params)
  const user = await db.user.findFirstOrThrow({ where: { id: params.id } })
  res.json(user)
}

export default convention(handler)
