import type { CtxForMakeCode } from './ctx'

const restfulStyle = {
  fn: [
    'export default makeTemplate(',
    '  ({ Filename: Model, relative2api, filename: model }) => {',
  ],
}
const postGetStyle = {
  fn: [
    'export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {',
  ],
}

export const makeCreationCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    actual.fn,
    '  const imps = [',
    "    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,",
    "    `import type { Pure } from '${relative2api}/../types/pure.js'`,",
    "    `import { convention } from '${relative2api}/convention.js'`,",
    "    `import { db } from '${relative2api}/db/prisma.js'`,",
    '  ]',
    '  const codes = [',
    '    `type ApiType = AuthedHandler<{ body: Pure.${Model}CreateInput }, Pure.${Model}>`,',
    "    '',",
    '    `/** Create ${Model} */`,',
    '    `const handler: ApiType = async (req, res) => {`,',
    '    `  const result = await db.${model}.create({`,',
    "    '    data: req.body,',",
    "    '  })',",
    "    '  res.send(result)',",
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
