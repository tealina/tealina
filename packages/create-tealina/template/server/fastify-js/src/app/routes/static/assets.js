import plugin4static from '@fastify/static'
import path from 'node:path'

/**
 * @type {import('fastify').FastifyPluginCallback}
 */
export const buildAssetsRouter = (fastify, _option, done) => {
  fastify.register(plugin4static, { root: path.resolve('public') })
  done()
}
