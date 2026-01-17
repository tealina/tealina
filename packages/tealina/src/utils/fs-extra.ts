import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

export function emptyDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    return
  }

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    fs.rmSync(fullPath, {
      recursive: true,
      force: true,
    })
  }
}

export function pathExistsSync(p: string) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

export async function pathExists(p: string) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}
export function ensureDirSync(dir: string) {
  fs.mkdirSync(dir, { recursive: true })

  const stat = fs.statSync(dir)
  if (!stat.isDirectory()) {
    throw new Error(`Path exists and is not a directory: ${dir}`)
  }
}
