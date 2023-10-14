// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    `import type { RawId } from '${relative2api}/../types/common'`,
    `import type { Pure } from '${relative2api}/../types/pure'`,
    `import { db } from '${relative2api}/db/prisma'`,
    `import { modelIdZ } from '${relative2api}/validate/modelId'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ params: RawId, body: Pure.${Model}UpdateInput }>`,
    '',
    `const updateById: ApiType = async (req, res) => {`,
    '  const { id } = modelIdZ.parse(req.params)',
    '  const data = req.body',
    `  const result = await db.${model}.update({`,
    '    where:{ id },',
    '    data,',
    '  })',
    '  res.code(200).send()',
    '}',
    '',
    `export default updateById`,
  ]
  return [...imps, '', ...codes].join('\n')
})
