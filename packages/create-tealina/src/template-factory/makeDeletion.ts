import { type CtxForMakeCode, replyExpression } from './ctx'
const restfulStyle = {
  imps: [
    "    `import type { RawId } from '${relative2api}/../types/common.js'`,",
    "    `import { modelIdZ } from '${relative2api}/validate/modelId.js'`,",
  ],
  apiType: ['  `type ApiType = AuthedHandler<{ params: RawId }>`,'],

  body: ["    '  const { id } = modelIdZ.parse(req.params)',"],
}
const postGetStyle = {
  imps: [
    "    `import type { ModelId } from '${relative2api}/../types/common.js'`,",
  ],
  apiType: ['    `type ApiType = AuthedHandler<{ body: ModelId }>`,'],
  body: "    '  const { id } = req.body',",
}
export const makeDeletetionCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    'export default makeTemplate(({ relative2api, Dir: Model, dir: model }) => {',
    '  const imps = [',
    "    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,",
    actual.imps,
    "    `import { convention } from '${relative2api}/convention.js'`,",
    "    `import { db } from '${relative2api}/db/prisma.js'`,",
    '  ]',
    '  const codes = [',
    actual.apiType,
    "    '',",
    '    `/** Delete ${Model} by id */`,',
    '    `const handler: ApiType = async (req, res) => {`,',
    actual.body,
    '    `  await db.${model}.delete({ where: { id } })`,',
    `    ${replyExpression[ctx.framwork]}`,
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
