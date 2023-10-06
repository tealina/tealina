import plugin4static from '@fastify/static'
import type { FastifyPluginAsync } from 'fastify'
import Fastify from 'fastify'
import { omitFn, pickFn } from 'fp-lite'
import path from 'path'
import qs from 'qs'
import apisV1 from '../api-v1/index.js'
import { VDOC_BASENAME, docRouter } from './docRoute.js'
import { registeApiRoutes } from './registeApiRoutes.js'
import { loadAPIs } from './resolveBatchExport.js'
import { verifyToken } from './verifyToken.js'

const separateObject = <T, Keys extends ReadonlyArray<keyof T>>(
  x: T,
  ...keys: Keys
) => [pickFn(x, ...keys), omitFn(x, ...keys)] as const

const buildV1Router: FastifyPluginAsync = async (fastify, option) => {
  const apiRecord = await loadAPIs(apisV1)
  const { get, ...rest } = apiRecord
  const [openGetApis, authGetApis] = separateObject(get, 'health')
  registeApiRoutes({ get: openGetApis }, fastify)
  fastify.register(function (restrictFastify, opts, done) {
    restrictFastify.addHook('preValidation', verifyToken)
    registeApiRoutes({ get: authGetApis, ...rest }, restrictFastify)
    done()
  })
}

const buildAppRouter: FastifyPluginAsync = async (fastify, option) => {
  fastify.register(plugin4static, { root: path.resolve('public') })
  fastify.register(docRouter, { prefix: VDOC_BASENAME })
  await fastify.register(buildV1Router, { prefix: '/api/v1' })
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
