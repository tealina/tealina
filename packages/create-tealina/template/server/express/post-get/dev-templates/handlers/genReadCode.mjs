// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import { ${Model} } from '@prisma/client'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import type {`,
    `  FindManyArgs,`,
    `  PageResult,`,
    `} from '${relative2api}/../types/common.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: FindManyArgs }, PageResult<${Model}> >`,
    '',
    `const getList: ApiType = async (req, res) => {`,
    `  const findManyArgs = req.body`,
    '  const [total, datas] = await db.$transaction([',
    `    db.${model}.count({ where: findManyArgs.where }),`,
    `    db.${model}.findMany(findManyArgs),`,
    '  ])',
    '  res.send({ total, datas })',
    '}',
    '',
    `export default getList`,
  ]
  return [...imps, '', ...codes].join('\n')
})
