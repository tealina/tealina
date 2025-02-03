import { kStatement, kLines, kLeadFn, kRestfulImps } from './common'
import { type CtxForMakeCode, replyExpression } from './ctx'
const restfulStyle = {
  imps: kRestfulImps,
  apiType: ["  'type ApiType = AuthedHandler<{ params: RawId }>',"],

  body: ["    '  const { id } = modelIdZ.parse(req.params)',"],
}
const postGetStyle = {
  imps: kStatement.impModelId,
  apiType: ["    'type ApiType = AuthedHandler<{ body: ModelId }>',"],
  body: "    '  const { id } = req.body',",
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
    `    '${kStatement.handler}',`,
    actual.body,
    '    `  await db.${model}.delete({ where: { id } })`,',
    `    ${replyExpression[ctx.framwork]}`,
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
