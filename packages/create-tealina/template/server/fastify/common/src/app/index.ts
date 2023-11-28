import plugin4static from '@fastify/static'
import { VDOC_BASENAME } from '@tealina/doc-ui'
import Fastify, { FastifyPluginAsync } from 'fastify'
import path from 'path'
import qs from 'qs'
import { buildApiRouter } from './buildApiRouter.js'
import { docRouter } from './docRoute.js'

const buildAppRouter: FastifyPluginAsync = async (fastify, _option) => {
  fastify.register(plugin4static, { root: path.resolve('public') })
  fastify.register(docRouter, { prefix: VDOC_BASENAME })
  await fastify.register(buildApiRouter, { prefix: '/api' })
  // fastify.ready(() => {
  //   console.log(fastify.printRoutes())
  // })
}

const buildApp = async () => {
  const fastify = Fastify({
    logger: true,
    querystringParser: str => qs.parse(str),
  })
  await fastify.register(buildAppRouter)
  return fastify
}

export { buildApp }
