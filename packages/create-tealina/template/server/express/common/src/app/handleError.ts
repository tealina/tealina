import { ErrorRequestHandler } from 'express'

const handleError: ErrorRequestHandler = (err, req, res, next) => {
  console.log('Catched', err)
  const code = res.statusCode - 200 < 100 ? 500 : res.statusCode
  res.status(code).json({ message: `${String(err)}`, statusCode: code })
}

export { handleError }
