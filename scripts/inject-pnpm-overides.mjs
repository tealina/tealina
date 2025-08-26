import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

const getAllPublickPkgs = () => {
  const root = path.resolve('packages')
  const pkgDirs = readdirSync(root)
  const pkgs = pkgDirs.map(subDir => {
    const dir = path.join(root, subDir)
    if (statSync(dir).isFile()) return null
    if (subDir.startsWith('create')) return
    const pkgJson = readFileSync(path.join(dir, 'package.json'))
    const obj = JSON.parse(pkgJson)
    if (obj.private) return null
    return { name: obj.name, dir }
  })
  return pkgs.filter(v => v != null)
}

/**
 * inject pnpm overrides to the temp create project.
 * Run this file with project path after you use the cproj command
 */
function main() {
  const [_bin, _self, projectPath] = process.argv
  const destDir = path.resolve(projectPath)
  const destPkgJsonPath = path.resolve(destDir, 'package.json')
  const pkgJson = JSON.parse(readFileSync(destPkgJsonPath))
  const pkgs = getAllPublickPkgs()
  const kvs = pkgs.map(v => {
    return [v.name, `file:${path.relative(destDir, v.dir)}`]
  })
  const injected = {
    ...pkgJson,
    pnpm: {
      overrides: Object.fromEntries(kvs)
    }
  }
  console.log('Injected overrides to ', destPkgJsonPath)
  writeFileSync(destPkgJsonPath, JSON.stringify(injected, null, 2))
}


main()


