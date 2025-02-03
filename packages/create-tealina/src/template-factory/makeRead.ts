import { kStatement, kLines, kLeadFn } from './common'
import type { CtxForMakeCode } from './ctx'

const restfulStyle = {
  fn: kLeadFn.restFul,
  imps: [
    "    `import { findManyArgsZ } from '${relative2api}/validate/findManyArgs.js'`,",
    "    `import type { PageResult, RawFindManyArgs } from '${relative2api}/../types/common.js'`,",
  ],
  apiType:
    "'type ApiType = AuthedHandler<{ query: RawFindManyArgs }, PageResult<Pure.${Model}>>',",
  query: "'  const findManyArgs = findManyArgsZ.parse(req.query)',",
}
const postGetStyle = {
  fn: kLeadFn.postGet,
  imps: [
    "    `import type { FindManyArgs, PageResult } from '${relative2api}/../types/common.js'`,",
  ],
  apiType:
    '`type ApiType = AuthedHandler<{ body: FindManyArgs }, PageResult<Pure.${Model}>>`,',
  query: "    'const findManyArgs = req.body',",
}

export const makeReadCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    actual.fn,
    '  const imps = [',
    `    ${kStatement.authHandler},`,
    `    "${kStatement.pure}",`,
    actual.imps,
    `    ${kStatement.convention},`,
    `    ${kStatement.db}`,
    '  ]',
    '  const codes = [',
    `    ${actual.apiType}`,
    "    '',",
    '    `/** Get page datas from ${Model} */`,',
    `    '${kStatement.handler}',`,
    `    ${actual.query}`,
    "    '  const [total, datas] = await db.$transaction([',",
    '    `    db.${model}.count({ where: findManyArgs.where }),`,',
    '    `    db.${model}.findMany(findManyArgs),`,',
    "    '  ])',",
    "    '  res.send({ total, datas })',",
    kLines.tail,
  ]
    .flat()
    .join('\n')
}
