import type { WithStatus } from '@tealina/utility-types'

export const kConfigKey = {
  FILEDS_VALUES: 'TEALINA_COMMON_FILEDS_VALUES',
  VDOC_CONFIG: 'TEALINA_VDOC_CONFIG',
}

export const kStatusCodeKey: keyof WithStatus<number> = '~status'
export const kResKey: keyof WithStatus<number> = 'response'
