//@ts-check
import { writeFileSync } from 'fs'
import { parseDeclarationFile } from '../src/utils/parseDeclarationFile.js'

const doc = parseDeclarationFile({
  entries: ['temp/fastify/post-get/server/types/api-v1.d.ts'],
  tsconfigPath: 'temp/fastify/restful/server/tsconfig.json',
})
writeFileSync('temp/doc.json', JSON.stringify(doc, null, 2))
