import { kStatement, kLines, kLeadFn } from './common'
import { kReplyFactory, type CtxForMakeCode } from './ctx'

export const makeCreationCode = (ctx: CtxForMakeCode) => {
  const lead = ctx.isRestful ? kLeadFn.restFul : kLeadFn.postGet
  return [
    lead,
    '  const imps = [',
    `    ${kStatement.authHandler},`,
    `    "${kStatement.pure}",`,
    `    ${kStatement.convention},`,
    `    ${kStatement.db}`,
    '  ]',
    '  const codes = [',
    '    `type ApiType = AuthedHandler<{ body: Pure.${Model}CreateInput }, Pure.${Model}>`,',
    "    '',",
    '    `/** Create ${Model} */`,',
    `    '${kStatement.handler}',`,
    '    `  const result = await db.${model}.create({`,',
    "    '    data: req.body,',",
    "    '  })',",
    `    '  ${kReplyFactory[ctx.framwork]('result')}',`,
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
