// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import type { Pure } from '${relative2api}/../types/pure.js'`,
    `import type {`,
    `  FindManyArgs,`,
    `  PageResult,`,
    `} from '${relative2api}/../types/common.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    `import { db } from '${relative2api}/db/prisma.js'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: FindManyArgs }, PageResult<Pure.${Model}> >`,
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
