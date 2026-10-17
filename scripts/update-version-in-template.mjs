import { writeFileSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

// Every template package that declares a workspace dependency. The `-js` trees and the
// web app are here for the same reason as the TypeScript trees: a version left behind in
// any of them is a scaffold that installs a different CLI than the one that generated it.
const TEMP_LIST = [
  'packages/create-tealina/template/server/express/package.json',
  'packages/create-tealina/template/server/express-js/package.json',
  'packages/create-tealina/template/server/fastify/package.json',
  'packages/create-tealina/template/server/fastify-js/package.json',
  'packages/create-tealina/template/server/koa/package.json',
  'packages/create-tealina/template/server/koa-js/package.json',
  'packages/create-tealina/template/web/package.json',
]

const updateTeamplateDependance = updates =>
  TEMP_LIST.map(dest => updatePackageContent(updates, dest))

const readJsonFile = dest =>
  readFile(dest, { encoding: 'utf-8' }).then(v => JSON.parse(v.toString()))
const writeJson = (dest, data) =>
  writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf-8',
  })
const formatLog = (dest, result) => {
  console.log('  -', dest)
  console.log('  ', result)
}
const updatePackageContent = async (updates, dest) => {
  const pkg = await readJsonFile(dest)
  let hasUpdate = false
  // Only touch dependencies the template already declares. One shared list then serves
  // every tree: the server templates pick up tealina/server/doc-ui, web picks up client,
  // and neither grows a dependency the other one owns.
  const actual = updates.reduce((acc, cur) => {
    const section = acc[cur.key]
    if (section == null) return acc
    for (const [name, version] of Object.entries(cur.value)) {
      if (!(name in section) || section[name] === version) continue
      section[name] = version
      hasUpdate = true
    }
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
    key: 'dependencies',
    value: {
      '@tealina/server': `^${next.version}`,
    },
  }
}

const latestTealinaClient = async () => {
  const next = await readJsonFile('packages/tealina-client/package.json')
  return {
    key: 'dependencies',
    value: {
      '@tealina/client': `^${next.version}`,
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

// Every scaffold that ships a versionMaps.json must be listed here, otherwise its
// template versions freeze at whatever was last committed by hand.
const kVersionMapPaths = ['packages/create-tealina/template/versionMaps.json']

const updateVersionMap = async (kVersionMapPath, subPkgMaps) => {
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
  return versionMaps
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
  for (const kVersionMapPath of kVersionMapPaths) {
    const versionMaps = await updateVersionMap(kVersionMapPath, subPkgMaps)
    console.log('Template dependancies version updated =>\n', kVersionMapPath)
    console.log(versionMaps)
  }
  console.log('Updating workspace dependency versions in templates:')
  const updates = await Promise.all([
    latestTealina(),
    latestTealinaServer(),
    latestTealinaClient(),
    latestDocUI(),
  ])
  await Promise.all(updateTeamplateDependance(updates))
}

workflow()
