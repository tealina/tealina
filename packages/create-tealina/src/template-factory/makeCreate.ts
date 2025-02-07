import { kStatement, kLines, kLeadFn } from './common'
import {
  kPayloadLeader,
  kReplyFactory,
  makeHandlerExp,
  type CtxForMakeCode,
} from './ctx'

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
    `    '${makeHandlerExp(ctx.framwork)}',`,
    '    `  const result = await db.${model}.create({`,',
    `    '    data: ${kPayloadLeader[ctx.framwork]}.body,',`,
    "    '  })',",
    `    '  ${kReplyFactory[ctx.framwork]('result')}',`,
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
