import plugin4static from '@fastify/static'
import type { FastifyPluginCallback } from 'fastify'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))

export const buildAssetsRouter: FastifyPluginCallback = (
  fastify,
  _option,
  done,
) => {
  fastify.register(plugin4static, { root: publicDir })
  done()
}
