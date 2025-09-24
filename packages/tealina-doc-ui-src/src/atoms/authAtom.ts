import { atom } from 'jotai'

export const authAtom = atom({
  isNeedPwd: window.TEALINA_VDOC_CONFIG.security != null,
  isValidated: false,
})
