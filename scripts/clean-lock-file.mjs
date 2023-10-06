import { execSync } from 'child_process'
import fg from 'fast-glob'
import { rmSync } from 'fs'
import path from 'path'

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

tempList.forEach(dest => {
  rmSync(dest, { recursive: true })
})

execSync('pnpm install', { stdio: 'inherit' })
