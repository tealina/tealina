// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api, dir: model, Dir: Model }) => {
  const imps = [
    `import type { AuthedHandler, RawId } from '${relative2api}/../types/handler.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
    `import { modelIdZ } from '${relative2api}/validate/modelId.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ params: RawId }>`,
    '',
    `/** Delete ${Model} by id */`,
    `const handler: ApiType = async (req, res) => {`,
    `  const { id } = modelIdZ.parse(req.params.id)`,
    `  await db.${model}.delete({ where: { id } })`,
    '  res.sendStatus(200)',
    '}',
    '',
    `export default convention(handler)`,
    '',
  ]
  return [...imps, '', ...codes].join('\n')
})
