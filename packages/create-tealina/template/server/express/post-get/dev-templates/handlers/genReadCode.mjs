// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    `import type {`,
    `  FindManyArgs,`,
    `  PageResult,`,
    `} from '${relative2api}/../types/common'`,
    `import { ${Model} } from '@prisma/client'`,
    `import { convention } from '${relative2api}/convention'`,
    `import { db } from '${relative2api}/db/prisma'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: FindManyArgs }, PageResult<${Model}> >`,
    '',
    `/** Get page datas from ${Model} */`,
    `const handler: ApiType = async (req, res) => {`,
    `  const findManyArgs = req.body`,
    '  const [total, datas] = await db.$transaction([',
    `    db.${model}.count({ where: findManyArgs.where }),`,
    `    db.${model}.findMany(findManyArgs),`,
    '  ])',
    '  res.send({ total, datas })',
    '}',
    '',
    `export default convention(handler)`,
  ]
  return [...imps, '', ...codes].join('\n')
})
