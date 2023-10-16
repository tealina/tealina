// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    `import type { ModelId  } from '${relative2api}/../types/common'`,
    `import type { Pure } from '${relative2api}/../types/pure'`,
    `import { ${Model} } from '@prisma/client'`,
    `import { convention } from '${relative2api}/convention'`,
    `import { db } from '${relative2api}/db/prisma'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: ModelId & Pure.${Model}UpdateInput }, ${Model}>`,
    '',
    `/** Update ${Model} by id */`,
    `const handler: ApiType = async (req, res) => {`,
    '  const { id, ...data } = req.body',
    `  const result = await db.${model}.update({`,
    '    where:{ id },',
    '    data,',
    '  })',
    '  res.json(result)',
    '}',
    '',
    `export default convention(handler)`,
  ]
  return [...imps, '', ...codes].join('\n')
})
