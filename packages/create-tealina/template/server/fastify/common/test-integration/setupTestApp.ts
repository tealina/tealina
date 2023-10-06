import type { FastifyInstance } from 'fastify'
import { afterAll } from 'vitest'
import { buildApp } from '../src/app/index.js'

export const setupTestApp = async () => {
  const ref = {} as { server: FastifyInstance }
  afterAll(() => ref.server.close())
  const server = await buildApp()
  ref.server = server
  await server.ready()
  return server.listen()
}
