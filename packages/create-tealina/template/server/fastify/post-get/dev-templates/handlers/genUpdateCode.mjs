// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import type { ModelId  } from '${relative2api}/../types/common.js'`,
    `import type { Pure } from '${relative2api}/../types/pure.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: ModelId & Pure.${Model}UpdateInput }, Pure.${Model}>`,
    '',
    `/** Update ${Model} by id */`,
    `const updateById: ApiType = async (req, res) => {`,
    '  const { id, ...data } = req.body',
    `  const result = await db.${model}.update({`,
    '    where:{ id },',
    '    data,',
    '  })',
    '  res.send(result)',
    '}',
    '',
    `export default convention(updateById)`,
    '',
  ]
  return [...imps, '', ...codes].join('\n')
})
