export interface CtxForMakeCode {
  isRestful: boolean
  framwork: 'express' | 'fastify'
}
export interface TemplateSnap {
  filename: string
  code: string
}

type SupportFramworks = 'express' | 'fastify'

export const replyExpression: Record<SupportFramworks, string> = {
  express: "'  res.sendStatus(200)',",
  fastify: "'  res.send()',",
}

export const kReplyFactory: Record<
  SupportFramworks,
  (result: string) => string
> = {
  express: result => `res.send(${result})`,
  fastify: result => `res.send(${result})`,
}
