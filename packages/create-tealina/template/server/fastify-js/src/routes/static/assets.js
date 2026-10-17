import plugin4static from '@fastify/static'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))

/** @type {import('fastify').FastifyPluginCallback} */
export const buildAssetsRouter = (fastify, _option, done) => {
  fastify.register(plugin4static, { root: publicDir })
  done()
}
