// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import type { RawId } from '${relative2api}/../types/common.js'`,
    `import type { Pure } from '${relative2api}/../types/pure.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
    `import { modelIdZ } from '${relative2api}/validate/modelId.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ params: RawId; body: Pure.${Model}UpdateInput }>`,
    '',
    `/** Update ${Model} by id */`,
    `const handler: ApiType = async (req, res) => {`,
    '  const { id } = modelIdZ.parse(req.params)',
    '  const data = req.body',
    `  const result = await db.${model}.update({`,
    '    where: { id },',
    '    data,',
    '  })',
    '  res.code(200).send()',
    '}',
    '',
    `export default convention(handler)`,
    '',
  ]
  return [...imps, '', ...codes].join('\n')
})
