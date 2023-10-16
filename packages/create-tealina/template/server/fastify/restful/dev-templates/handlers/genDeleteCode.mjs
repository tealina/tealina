// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api, Dir: Model, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    `import type { RawId } from '${relative2api}/../types/common'`,
    `import { convention } from '${relative2api}/convention'`,
    `import { db } from '${relative2api}/db/prisma'`,
    `import { modelIdZ } from '${relative2api}/validate/modelId'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ params: RawId }>`,
    '',
    `/** Delete ${Model} record by id */`,
    `const handler: ApiType = async (req, res) => {`,
    `  const { id } = modelIdZ.parse(req.params.id)`,
    `  await db.${model}.delete({ where: { id } })`,
    '  res.code(200).send()',
    '}',
    '',
    `export default convention(handler)`,
  ]
  return [...imps, '', ...codes].join('\n')
})
