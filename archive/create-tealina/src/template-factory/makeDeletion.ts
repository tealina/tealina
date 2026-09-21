import { kStatement, kLines, kLeadFn, kRestfulImps } from './common'
import {
  type CtxForMakeCode,
  kPayloadLeader,
  makeHandlerExp,
  replyExpression,
  type SupportFramworks,
} from './ctx'
const restfulStyle = {
  imps: kRestfulImps,
  apiType: ["  'type ApiType = AuthedHandler<{ params: RawId }>',"],

  body: (f: SupportFramworks) => [
    `    '  const { id } = modelIdZ.parse(${kPayloadLeader[f]}.params)',`,
  ],
}
const postGetStyle = {
  imps: kStatement.impModelId,
  apiType: ["    'type ApiType = AuthedHandler<{ body: ModelId }>',"],
  body: (f: SupportFramworks) =>
    `    '  const { id } = ${kPayloadLeader[f]}.body',`,
}
export const makeDeletetionCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    kLeadFn.postGet,
    '  const imps = [',
    `    ${kStatement.authHandler},`,
    actual.imps,
    `    ${kStatement.convention},`,
    `    ${kStatement.db}`,
    '  ]',
    '  const codes = [',
    actual.apiType,
    "    '',",
    '    `/** Delete ${Model} by id */`,',
    `    '${makeHandlerExp(ctx.framwork)}',`,
    actual.body(ctx.framwork),
    '    `  await db.${model}.delete({ where: { id } })`,',
    `    ${replyExpression[ctx.framwork]}`,
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
