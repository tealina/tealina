// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler, RawId } from '${relative2api}/../types/handler.js'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
    `import { modelIdZ } from '${relative2api}/validate/modelId.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ params: RawId }>`,
    '',
    `const deleById: ApiType = async (req, res) => {`,
    `  const { id } = modelIdZ.parse(req.params.id)`,
    `  await db.${model}.delete({ where: { id } })`,
    '  res.code(200).send()',
    '}',
    '',
    `export default deleById`,
  ]
  return [...imps, '', ...codes].join('\n')
})
