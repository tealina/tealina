import { writeFileSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const TEMP_LIST = [
  'packages/create-tealina/template/server/express/package.json',
  'packages/create-tealina/template/server/fastify/package.json',
  'packages/create-tealina/template/server/koa/package.json',
]

const updateTeamplateDependance = updates =>
  TEMP_LIST.map(dest => updatePackageContent(updates, dest))

const readJsonFile = dest =>
  readFile(dest, { encoding: 'utf-8' }).then(v => JSON.parse(v.toString()))
const writeJson = (dest, data) => writeFileSync(dest, JSON.stringify(data, null, 2), {
  encoding: 'utf-8',
})
const deepValueEqual = (a, b) => Object.entries(b).every(([k, v]) => a[k] === v)

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

const latestTealinaServer = async () => {
  const next = await readJsonFile('packages/tealina-server/package.json')
  return {
    key: 'devDependencies',
    value: {
      "@tealina/server": `^${next.version}`,
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
  const pkgsDir = 'packages'
  const packagesNames = await readdir(pkgsDir)
  const subPkgMaps = new Map()
  for (const subPkg of packagesNames) {
    const subDir = join(pkgsDir, subPkg)
    const sta = await stat(subDir)
    if (!sta.isDirectory()) continue
    const pkgJson = await readJsonFile(join(pkgsDir, subPkg, 'package.json'))
    subPkgMaps.set(pkgJson.name, pkgJson)
  }
  const kVersionMapPath = 'packages/create-tealina/template/versionMaps.json'
  const versionMaps = await readJsonFile(kVersionMapPath)
  for (const key in versionMaps) {
    const project = versionMaps[key]
    for (const depKey in project) {
      const depend = project[depKey]
      for (const pkgName of Object.keys(depend)) {
        const latest = subPkgMaps.get(pkgName)
        if (latest == null) throw new Error(`sub pkg not found,${pkgName}`)
        depend[pkgName] = `^${latest.version}`
      }
    }
  }
  writeJson(kVersionMapPath, versionMaps)
  // console.log('Intent to update version No. in templates:')
  // const updates = await Promise.all([latestTealina(), latestDocUI()])
  // await Promise.all(updateTeamplateDependance(updates))
  console.log('Template dependancies version updated =>\n', versionMaps)
  // execSync('pnpm test -F create-tealina', { stdio: 'inherit' })
}

workflow()
