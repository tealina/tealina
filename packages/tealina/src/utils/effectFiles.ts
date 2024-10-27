import {
  filter,
  flow,
  groupBy,
  invoke,
  isEmpty,
  map,
  omit,
  pipe,
} from 'fp-lite'
import { existsSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'pathe'
import { ensureWrite } from './tool'
import type { DirInfo } from './withTypeFile'

export const completePath =
  ({ apiDir }: Pick<DirInfo, 'apiDir'>) =>
  (v: Snapshot) => ({
    ...v,
    filePath: join(apiDir, v.filePath),
  })

const changedOnly = (v: Snapshot): boolean =>
  v.action === 'create' || v.action !== 'update' || v.code != null

const deleteFile = (snapshot: Snapshot) => {
  if (existsSync(snapshot.filePath)) {
    unlinkSync(snapshot.filePath)
  }
  return snapshot
}

const mutateFile = (snapshot: Snapshot) => {
  const { filePath } = snapshot
  if (snapshot.code != null) {
    ensureWrite(filePath, snapshot.code)
  }
}

const cleanEmptyDirs = (dir: string): string[] =>
  pipe(readdirSync(dir), names => {
    if (!isEmpty(names)) return []
    rmdirSync(dir)
    return cleanEmptyDirs(dirname(dir))
  })

const updateFiles = flow(
  groupBy((v: Snapshot) => (v.action === 'delete' ? 'delete' : 'mutation')),
  g => {
    pipe(
      g.get('delete') ?? [],
      map(flow(deleteFile, v => dirname(v.filePath), cleanEmptyDirs)),
    )
    pipe(g.get('mutation') ?? [], map(mutateFile))
  },
)

export const effectFiles = flow(
  filter(changedOnly),
  invoke(updateFiles),
  map(omit('code')),
)

export type Snapshot = {
  group: 'api' | 'test' | 'types'
  action: 'update' | 'create' | 'delete'
  filePath: string
  code?: string | null
}
