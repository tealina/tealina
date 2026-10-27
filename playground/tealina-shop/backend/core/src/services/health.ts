import type { Health } from './model.js'

export const getHealth = (): Health => ({
  status: 'ok',
  service: 'tealina-shop',
  time: new Date().toISOString(),
})
