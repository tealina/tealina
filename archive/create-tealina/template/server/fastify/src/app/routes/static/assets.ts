import plugin4static from '@fastify/static';
import { FastifyPluginCallback } from 'fastify';
import path from 'path';


export const buildAssetsRouter: FastifyPluginCallback = (fastify, _option, done) => {
  fastify.register(plugin4static, { root: path.resolve('public') })
  done()
}
