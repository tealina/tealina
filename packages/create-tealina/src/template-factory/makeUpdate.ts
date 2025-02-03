import { kStatement, kLines, kRestfulImps } from './common'
import type { CtxForMakeCode } from './ctx'

const restfulStyle = {
  imps: kRestfulImps,
  apiType: [
    "    'type ApiType = AuthedHandler<',",
    '    `  { params: RawId; body: Pure.${Model}UpdateInput },`,',
    '    `  Pure.${Model}`,',
    "    '>',",
  ],
  body: [
    "    '  const { id } = modelIdZ.parse(req.params)',",
    "    '  const data = req.body',",
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
  body: "    '  const { id, ...data } = req.body',",
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
    `    '${kStatement.handler}',`,
    actual.body,
    '    `  const result = await db.${model}.update({`,',
    "    '    where: { id },',",
    "    '    data,',",
    "    '  })',",
    "    '  res.send(result)',",
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
