import { kStatement, kLines, kRestfulImps } from './common'
import {
  kPayloadLeader,
  kReplyFactory,
  makeHandlerExp,
  type SupportFramworks,
  type CtxForMakeCode,
} from './ctx'

const restfulStyle = {
  imps: kRestfulImps,
  apiType: [
    "    'type ApiType = AuthedHandler<',",
    '    `  { params: RawId; body: Pure.${Model}UpdateInput },`,',
    '    `  Pure.${Model}`,',
    "    '>',",
  ],
  body: (framwork: SupportFramworks) => [
    `    '  const { id } = modelIdZ.parse(${kPayloadLeader[framwork]}.params)',`,
    `    '  const data = ${kPayloadLeader[framwork]}.body',`,
  ],
}
const postGetStyle = {
  imps: kStatement.impModelId,
  apiType: [
    "    'type ApiType = AuthedHandler<',",
    '    `  { body: ModelId & Pure.${Model}UpdateInput },`,',
    '    `  Pure.${Model}`,',
    "    '>',",
  ],
  body: (framwork: SupportFramworks) =>
    `    '  const { id, ...data } = ${kPayloadLeader[framwork]}.body',`,
}

export const makeUpdateCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    'export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {',
    '  const imps = [',
    `    ${kStatement.authHandler},`,
    `    "${kStatement.pure}",`,
    `    ${kStatement.convention},`,
    `    ${kStatement.db},`,
    actual.imps,
    '  ]',
    '  const codes = [',
    actual.apiType,
    "    '',",
    '    `/** Update ${Model} by id */`,',
    `    '${makeHandlerExp(ctx.framwork)}',`,
    actual.body(ctx.framwork),
    '    `  const result = await db.${model}.update({`,',
    "    '    where: { id },',",
    "    '    data,',",
    "    '  })',",
    `    '  ${kReplyFactory[ctx.framwork]('result')}',`,
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
