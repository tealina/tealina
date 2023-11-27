import { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.log('Catched', err)
  const code = res.statusCode - 200 < 100 ? 500 : res.statusCode
  res.status(code).json({ message: `${String(err)}`, statusCode: code })
}
