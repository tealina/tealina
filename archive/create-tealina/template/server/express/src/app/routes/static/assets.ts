import express, { type RequestHandler, Router } from 'express'
import path from 'node:path'

const staticNotFoundHandler: RequestHandler = (_req, res, _next) => {
  res.sendFile(path.resolve('public/index.html'))
}

export const staticAssetsRouter = Router()
  .use(express.static(path.resolve('public')))
  .use(staticNotFoundHandler)
