export type SupportFramworks = 'express' | 'fastify' | 'koa'

export interface CtxForMakeCode {
  isRestful: boolean
  framwork: SupportFramworks
}
export interface TemplateSnap {
  filename: string
  code: string
}

export const replyExpression: Record<SupportFramworks, string> = {
  express: "'  res.sendStatus(200)',",
  fastify: "'  reply.status(200).send()',",
  koa: "'  ctx.status = 200',",
}

export const kReplyFactory: Record<
  SupportFramworks,
  (result: string) => string
> = {
  express: result => `res.send(${result})`,
  fastify: result => `reply.send(${result})`,
  koa: result => `ctx.body = ${result}`,
}

export const kHanlderParams: Record<SupportFramworks, string> = {
  express: '(req, res)',
  fastify: '(request, reply)',
  koa: 'ctx',
}

export const kPayloadLeader: Record<SupportFramworks, string> = {
  express: 'req',
  fastify: 'request',
  koa: 'ctx.request',
}

export const makeHandlerExp = (framwork: SupportFramworks) =>
  `const handler: ApiType = async ${kHanlderParams[framwork]} => {`
