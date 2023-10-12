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
import { readdirSync, rmdirSync, unlinkSync } from 'fs'
import path from 'path'
import { TealinaComonOption } from './options'
import { ensureWrite } from './tool'

export const completePath =
  ({ apiDir }: TealinaComonOption) =>
  (v: Snapshot) => ({
    ...v,
    filePath: path.join(apiDir, v.filePath),
  })

const changedOnly = (v: Snapshot): boolean =>
  v.action == 'created' || v.action != 'updated' || v.code != null

const deleteFile = (snapshot: Snapshot) => {
  unlinkSync(snapshot.filePath)
  return snapshot
}

const mutateFile = (snapshot: Snapshot) => {
  const { filePath } = snapshot
  ensureWrite(filePath, snapshot.code!)
}

const cleanEmptyDirs = (dir: string): string[] =>
  pipe(readdirSync(dir), names =>
    isEmpty(names) ? (rmdirSync(dir), cleanEmptyDirs(path.dirname(dir))) : [],
  )

const updateFiles = flow(
  groupBy((v: Snapshot) => (v.action == 'deleted' ? 'delete' : 'mutation')),
  g => {
    pipe(
      g.get('delete') ?? [],
      map(flow(deleteFile, v => path.dirname(v.filePath), cleanEmptyDirs)),
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
  action: 'updated' | 'created' | 'deleted'
  filePath: string
  code?: string | null
}
