import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TemplateSnap } from './ctx'

const leader = [
  '//@ts-check',
  "import { makeTemplate } from 'tealina'",
  '',
  '',
].join('\n')

export const writeTemplates = (dest: string, tempaltes: TemplateSnap[]) => {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }
  return Promise.all(
    tempaltes.map(v =>
      writeFile(
        join(dest, v.filename),
        v.filename === 'index.mjs' ? v.code : leader + v.code,
      ),
    ),
  )
}
