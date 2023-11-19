// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api, Dir: Model, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import type { ModelId } from '${relative2api}/../types/common.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: ModelId }>`,
    '',
    `/** Delete ${Model} by id */`,
    `const handler: ApiType = async (req, res) => {`,
    `  await db.${model}.delete({ where: { id: req.body.id } })`,
    '  res.sendStatus(200)',
    '}',
    '',
    `export default convention(handler)`,
  ]
  return [...imps, '', ...codes].join('\n')
})