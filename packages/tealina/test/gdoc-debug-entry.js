//@ts-check
import { writeFileSync } from 'fs'
import { parseDeclarationFile } from '../src/utils/parseDeclarationFile.js'

const doc = parseDeclarationFile({
  entries: ['temp/koa/packages/server/types/api-v1.d.ts'],
  tsconfigPath: 'temp/koa/packages/server/tsconfig.json',
})
writeFileSync('temp/doc.json', JSON.stringify(doc, null, 2))
