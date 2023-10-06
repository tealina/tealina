import { atom } from 'jotai'
type ThemeType = 'dark' | 'light'

const syncBodyClassList = (update: ThemeType) => {
  update == 'light'
    ? window.document.body.classList.remove('dark')
    : window.document.body.classList.add('dark')
}

const initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light'

syncBodyClassList(initialTheme)

export const themeAtom = atom<ThemeType, [ThemeType], void>(
  initialTheme,
  (_get, set, update) => {
    syncBodyClassList(update)
    set(themeAtom, update)
  },
)

export const DarkColors = {
  string: 'rgb(206, 145, 120)',
  number: 'rgb(181, 206, 168)',
  enum: 'rgb(206, 145, 120)',
  any: 'rgb(78, 201, 176)',
  const: 'rgb(86, 156, 214)',
  prop: 'rgb(156, 220, 254)',
  comment: 'rgb(106, 153, 85)',
} as const

export const LightColors = {
  string: 'rgb(190, 85, 42)',
  number: 'rgb(46, 125, 50)',
  enum: 'rgb(203, 104, 65)',
  any: 'rgb(142, 36, 170)',
  const: 'rgb(5, 116, 175)',
  prop: 'rgb(0, 120, 184)',
  comment: 'rgb(77, 154, 41)',
} as const

export const syntaxColorAtom = atom(get =>
  get(themeAtom) == 'dark' ? DarkColors : LightColors,
)
