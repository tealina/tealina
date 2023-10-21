import { access } from 'fs/promises'
import path from 'node:path'
import { genTypeCode } from './codeGen'
import { Snapshot } from './effectFiles'

export interface TypeFileInfo {
  filePath: string
  isExists: boolean
}

export const calcTypeFileSnapshot = ({
  typeFileInfo,
  commonOption,
}: {
  typeFileInfo: TypeFileInfo
  commonOption: DirInfo
}): Snapshot[] => {
  if (typeFileInfo.isExists) return []
  return [
    {
      group: 'types',
      action: 'create',
      filePath: typeFileInfo.filePath,
      code: genTypeCode(commonOption),
    },
  ]
}
export interface DirInfo {
  typesDir: string
  testDir: string
  apiDir: string
}

export const getApiTypeFilePath = (dirInfo: Omit<DirInfo, 'testDir'>) =>
  path.join(dirInfo.typesDir, path.basename(dirInfo.apiDir) + '.d.ts')

export const collectTypeFileInfo = async (
  dirInfo: DirInfo,
): Promise<TypeFileInfo> => {
  const filePath = getApiTypeFilePath(dirInfo)
  const isExists = await access(filePath).then(
    v => true,
    () => false,
  )
  return { filePath, isExists }
}
