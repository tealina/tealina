import { access } from 'node:fs/promises'
import path from 'node:path'
import { genTypeCode } from './codeGen'
import type { Snapshot } from './effectFiles'

export interface TypeFileInfo {
  filePath: string
  isExists: boolean
}

export const calcTypeFileSnapshot = ({
  typeFileInfo,
  options,
  suffix,
}: {
  typeFileInfo: TypeFileInfo
  options: Omit<DirInfo, 'testDir'>
  suffix: string
}): Snapshot[] => {
  if (typeFileInfo.isExists) return []
  return [
    {
      group: 'types',
      action: 'create',
      filePath: typeFileInfo.filePath,
      code: genTypeCode(options, suffix),
    },
  ]
}
export interface DirInfo {
  typesDir: string
  testDir: string
  apiDir: string
}

export const getApiTypeFilePath = (dirInfo: Omit<DirInfo, 'testDir'>) =>
  path.join(dirInfo.typesDir, `${path.basename(dirInfo.apiDir)}.d.ts`)

export const collectTypeFileInfo = async (
  dirInfo: Omit<DirInfo, 'testDir'>,
): Promise<TypeFileInfo> => {
  const filePath = getApiTypeFilePath(dirInfo)
  const isExists = await access(filePath).then(
    v => true,
    () => false,
  )
  return { filePath, isExists }
}
