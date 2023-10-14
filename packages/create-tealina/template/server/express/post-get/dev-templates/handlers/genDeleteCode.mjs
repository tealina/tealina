// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api, dir: model }) => {
  const imps = [
    `import { db } from '${relative2api}/db/prisma'`,
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    `import type { ModelId } from '${relative2api}/../types/common'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: ModelId }>`,
    '',
    `const deleById: ApiType = async (req, res) => {`,
    `  await db.${model}.delete({ where: { id: req.body.id } })`,
    '  res.sendStatus(200)',
    '}',
    '',
    `export default deleById`,
  ]
  return [...imps, '', ...codes].join('\n')
})
