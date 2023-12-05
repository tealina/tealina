import { Router } from 'express'
import apisV1 from '../api-v1/index.js'
import { validateMethod } from '../utils/registeApiRoutes.js'
import {
  registeSeparetely,
  type TakeMethodAndPathRecord,
} from '../utils/registeSeparetely.js'
import { loadAPIs } from '../utils/resolveBatchExport.js'

/**
 * APIs without the need to log in
 * Don't forget use OpenHandler to declare your handler type
 */
const OpenPathRecord: Partial<TakeMethodAndPathRecord<typeof apisV1>> = {
  get: ['status'],
  // post: ['user/login'],
}

export const buildV1Router = async () => {
  const record = await loadAPIs(apisV1)
  validateMethod(record)
  const [openRouter, authRouter] = registeSeparetely(record, OpenPathRecord)
  const router = Router().use(openRouter).use(authRouter)
  return router
}
