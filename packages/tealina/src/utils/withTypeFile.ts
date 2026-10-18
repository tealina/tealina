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
  options: Omit<DirInfo, 'testDir'> & { handlerImport?: string }
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

/**
 * The contract type file, under one name in every project.
 *
 * It used to be `<basename(apiDir)>.d.ts`, which made the api directory's name an input
 * to a public filename. The name is fixed now: the package export is `./api`, and moving
 * the directory changes nothing a frontend sees.
 */
export const kApiTypeFileName = 'api.d.ts'

export const getApiTypeFilePath = (dirInfo: Omit<DirInfo, 'testDir'>) =>
  path.join(dirInfo.typesDir, kApiTypeFileName)

export const collectTypeFileInfo = async (
  dirInfo: Omit<DirInfo, 'testDir'>,
): Promise<TypeFileInfo> => {
  const filePath = getApiTypeFilePath(dirInfo)
  const isExists = await access(filePath).then(
    () => true,
    () => false,
  )
  return { filePath, isExists }
}
