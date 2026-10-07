import plugin4static from '@fastify/static'
import type { FastifyPluginCallback } from 'fastify'
import path from 'node:path'

export const buildAssetsRouter: FastifyPluginCallback = (
  fastify,
  _option,
  done,
) => {
  fastify.register(plugin4static, { root: path.resolve('public') })
  done()
}
