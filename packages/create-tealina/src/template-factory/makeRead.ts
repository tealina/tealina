import type { CtxForMakeCode } from './ctx'

const restfulStyle = {
  fn: [
    'export default makeTemplate(',
    '  ({ Filename: Model, relative2api, filename: model }) => {',
  ],
  imps: [
    "    `import { findManyArgsZ } from '${relative2api}/validate/findManyArgs.js'`,",
    "    `import type { PageResult, RawFindManyArgs } from '${relative2api}/../types/common.js'`,",
  ],
  apiType:
    '`type ApiType = AuthedHandler<{ query: RawFindManyArgs }, PageResult<Pure.${Model}>>`,',
  query: '`  const findManyArgs = findManyArgsZ.parse(req.query)`,',
}
const postGetStyle = {
  fn: [
    'export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {',
  ],
  imps: [
    "    `import type { FindManyArgs, PageResult } from '${relative2api}/../types/common.js'`,",
  ],
  apiType:
    '`type ApiType = AuthedHandler<{ body: FindManyArgs }, PageResult<Pure.${Model}>>`,',
  query: '`  const findManyArgs = req.body`,',
}

export const makeReadCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    actual.fn,
    '  const imps = [',
    "    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,",
    "    `import type { Pure } from '${relative2api}/../types/pure.js'`,",
    actual.imps,
    "    `import { convention } from '${relative2api}/convention.js'`,",
    "    `import { db } from '${relative2api}/db/prisma.js'`,",
    '  ]',
    '  const codes = [',
    `    ${actual.apiType}`,
    "    '',",
    '    `/** Get page datas from ${Model} */`,',
    '    `const handler: ApiType = async (req, res) => {`,',
    `    ${actual.query}`,
    "    '  const [total, datas] = await db.$transaction([',",
    '    `    db.${model}.count({ where: findManyArgs.where }),`,',
    '    `    db.${model}.findMany(findManyArgs),`,',
    "    '  ])',",
    "    '  res.send({ total, datas })',",
    "    '}',",
    "    '',",
    '    `export default convention(handler)`,',
    "    '',",
    '  ]',
    "  return [...imps, '', ...codes].join('\\n')",
    '})',
  ]
    .flat()
    .join('\n')
}
