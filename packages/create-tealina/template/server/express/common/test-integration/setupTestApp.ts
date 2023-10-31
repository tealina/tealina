import type { Express } from 'express'
import type { Server } from 'http'
import { afterAll } from 'vitest'
import { buildApp } from '../src/app/index.js'

const getAdress = (server: Server): string => {
  const addr = server.address()
  if (addr == null) {
    throw new Error('Server address is null')
  }
  return typeof addr == 'string'
    ? addr
    : ['http://localhost', addr.port].join(':')
}

const initSearver = (app: Express): Promise<Server> =>
  new Promise((res, rej) => {
    const _server = app.listen()
    _server.on('listening', () => {
      res(_server)
    })
    _server.on('error', rej)
  })

const setupTestApp = async () => {
  const ref = {} as { server: Server }
  afterAll(() => {
    ref.server.close()
  })
  const app = await buildApp()
  ref.server = await initSearver(app)
  return getAdress(ref.server)
}

export { setupTestApp }
