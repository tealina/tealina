import { execSync } from 'node:child_process'
import fg from 'fast-glob'
import { rmSync } from 'node:fs'
import path from 'node:path'

const unique = xs => new Set(xs)

const collectNodeModules = ({ cwd }) =>
  fg(['(**/node_modules)'], {
    onlyDirectories: true,
    deep: 5,
    cwd,
  }).then(xs => {
    if (xs.length < 1) return []
    const heads = xs.map(v => v.split('node_modules')[0])
    const firsts = [...unique(heads)]
    return firsts.map(v => path.join(cwd, v, 'node_modules'))
  })

const tempList = await Promise.all(
  [
    { cwd: path.resolve('temp') },
    { cwd: path.resolve('playground/doc-factory') },
  ].map(collectNodeModules),
).then(v => v.flat())

for (const dest of tempList) {
  rmSync(dest, { recursive: true })
}

execSync('pnpm install', { stdio: 'inherit' })
