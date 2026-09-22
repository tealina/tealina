import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

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

const stripOverrides = yaml => yaml.replace(/\noverrides:\n(?:[ \t].*\n?)*/g, '')

/**
 * inject pnpm overrides to the temp create project.
 * Run this file with project path after you use the cproj command
 *
 * The overrides have to land in the project's pnpm-workspace.yaml. Since pnpm 11
 * the `pnpm` field of package.json is no longer read, so writing them there
 * would look like it worked and change nothing.
 */
function main() {
  const [_bin, _self, projectPath] = process.argv
  const destDir = path.resolve(projectPath)
  const workspacePath = path.resolve(destDir, 'pnpm-workspace.yaml')
  const pkgs = getAllPublickPkgs()
  // `@scope/name` opens with a reserved YAML indicator, so the keys are quoted.
  const overrides = pkgs
    .map(v => `  '${v.name}': file:${path.relative(destDir, v.dir)}`)
    .join('\n')
  const existing = existsSync(workspacePath)
    ? stripOverrides(readFileSync(workspacePath, 'utf-8'))
    : 'packages:\n  - "packages/*"\n'
  writeFileSync(
    workspacePath,
    `${existing.trimEnd()}\n\noverrides:\n${overrides}\n`,
  )
  console.log('Injected overrides to ', workspacePath)
}

main()
