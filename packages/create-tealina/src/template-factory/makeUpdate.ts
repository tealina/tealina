import { CtxForMakeCode } from './ctx'

const restfulStyle = {
  imps: [
    "    `import type { RawId } from '${relative2api}/../types/common.js'`,",
    "    `import { modelIdZ } from '${relative2api}/validate/modelId.js'`,",
  ],
  apiType: [
    '  `type ApiType = AuthedHandler<{ params: RawId; body: Pure.${Model}UpdateInput }>`,',
  ],

  body: [
    "    '  const { id } = modelIdZ.parse(req.params)',",
    "    '  const data = req.body',",
  ],
}
const postGetStyle = {
  imps: [
    "    `import type { ModelId } from '${relative2api}/../types/common.js'`,",
  ],
  apiType: [
    '    `type ApiType = AuthedHandler<`,',
    '    `  { body: ModelId & Pure.${Model}UpdateInput },`,',
    '    `  Pure.${Model}`,',
    '    `>`,',
  ],
  body: "    '  const { id, ...data } = req.body',",
}

export const makeUpdateCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    'export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {',
    '  const imps = [',
    "    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,",
    "    `import type { Pure } from '${relative2api}/../types/pure.js'`,",
    "    `import { convention } from '${relative2api}/convention.js'`,",
    "    `import { db } from '${relative2api}/db/prisma.js'`,",
    actual.imps,
    '  ]',
    '  const codes = [',
    actual.apiType,
    "    '',",
    '    `/** Update ${Model} by id */`,',
    '    `const handler: ApiType = async (req, res) => {`,',
    actual.body,
    '    `  const result = await db.${model}.update({`,',
    "    '    where: { id },',",
    "    '    data,',",
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
