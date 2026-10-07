import express, { Router } from 'express'
import path from 'node:path'

export const staticAssetsRouter = Router().use(
  express.static(path.resolve('public')),
)
