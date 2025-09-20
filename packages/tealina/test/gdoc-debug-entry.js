//@ts-check
import { writeFileSync } from 'fs'
import { parseDeclarationFile } from '../src/utils/parseDeclarationFile.js'
import path from 'path'

const doc = parseDeclarationFile({
  entries: ['temp/koa/packages/server/types/api-v1.d.ts'],
  tsconfigPath: 'temp/koa/packages/server/tsconfig.json',
})
const output = path.resolve('temp/doc.json')
writeFileSync(output, JSON.stringify(doc, null, 2))
