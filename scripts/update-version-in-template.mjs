import { writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'

// Every template package that declares a workspace dependency. The backend is one
// manifest per package per tree, the `-js` trees included: a version left behind in any of
// them is a scaffold that installs a different CLI than the one that generated it.
const TEMPLATE_TREES = ['core', 'api-v1', 'server']

const templatePackagePaths = async () => {
  const base = 'packages/create-tealina/template'
  const out = [`${base}/web/package.json`]
  for (const tree of TEMPLATE_TREES) {
    const dir = `${base}/${tree}`
    for (const rel of await readdir(dir, { recursive: true })) {
      if (rel === 'package.json' || rel.endsWith('/package.json')) {
        out.push(`${dir}/${rel}`)
      }
    }
  }
  return out
}

const updateTeamplateDependance = (paths, updates) =>
  paths.map(dest => updatePackageContent(updates, dest))

const readJsonFile = dest =>
  readFile(dest, { encoding: 'utf-8' }).then(v => JSON.parse(v.toString()))
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

const workflow = async () => {
  console.log(`Updating workspace dependency versions in template packages:`)
  const updates = await Promise.all([
    latestTealina(),
    latestTealinaServer(),
    latestTealinaClient(),
    latestDocUI(),
  ])
  await Promise.all(
    updateTeamplateDependance(await templatePackagePaths(), updates),
  )
}

workflow()
