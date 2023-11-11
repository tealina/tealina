import { execSync } from 'node:child_process'
import { writeFileSync } from 'fs'
import { readFile } from 'node:fs/promises'

const TEMP_LIST = [
  'packages/create-tealina/template/server/express/common/package.json',
  'packages/create-tealina/template/server/fastify/common/package.json',
]

const updateTeamplateDependance = updates =>
  TEMP_LIST.map(dest => updatePackageContent(updates, dest))

const readJsonFile = dest =>
  readFile(dest, { encoding: 'utf-8' }).then(v => JSON.parse(v.toString()))

const deepValueEqual = (a, b) => Object.entries(b).every(([k, v]) => a[k] == v)

const formatLog = (dest, result) => {
  console.log('  -', dest)
  console.log('  ', result)
}
const updatePackageContent = async (updates, dest) => {
  const pkg = await readJsonFile(dest)
  let hasUpdate = false
  const actual = updates.reduce((acc, cur) => {
    if (deepValueEqual(acc[cur.key], cur.value)) return acc
    Object.assign(acc[cur.key], cur.value)
    hasUpdate = true
    return acc
  }, pkg)
  if (!hasUpdate) return formatLog(dest, 'Nothing updated')
  writeFileSync(dest, JSON.stringify(actual, null, 2), {
    encoding: 'utf-8',
  })
  formatLog(dest, 'Updated')
}

const latestTealina = async () => {
  const next = await readJsonFile('packages/tealina/package.json')
  return {
    key: 'devDependencies',
    value: {
      tealina: `^${next.version}`,
    },
  }
}

const latestDocUI = async () => {
  const next = await readJsonFile('packages/tealina-doc-ui/package.json')
  return {
    key: 'dependencies',
    value: {
      '@tealina/doc-ui': `^${next.version}`,
    },
  }
}

const workflow = async () => {
  console.log('Intent to update version No. in templates:')
  const updates = await Promise.all([latestTealina(), latestDocUI()])
  await Promise.all(updateTeamplateDependance(updates))
  execSync('pnpm test -F create-tealina', { stdio: 'inherit' })
}

workflow()
