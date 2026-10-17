import express, { Router } from 'express'
import { fileURLToPath } from 'node:url'

export const staticAssetsRouter = Router().use(
  express.static(fileURLToPath(new URL('../../../public', import.meta.url))),
)
