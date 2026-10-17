import 'fastify'
import { AuthedLocals } from './common.js'

declare module 'fastify' {
  interface FastifyRequest {
    locals?: AuthedLocals
  }
}
