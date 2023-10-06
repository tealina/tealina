// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import { ${Model} } from '@prisma/client'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import type { ModelId  } from '${relative2api}/../types/common.js'`,
    `import type { Pure } from '${relative2api}/../types/pure.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: ModelId }, Pure.${Model}UpdateInput>`,
    '',
    `const updateById: ApiType = async (req, res) => {`,
    '  const { id } = req.body',
    '  const data = req.body',
    `  const result = await db.${model}.update({`,
    '    where:{ id },',
    '    data,',
    '  })',
    '  res.sendStatus(200)',
    '}',
    '',
    `export default updateById`,
  ]
  return [...imps, '', ...codes].join('\n')
})
