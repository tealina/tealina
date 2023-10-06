import TestingLibraryMatchers from '@testing-library/jest-dom/matchers'

export {}

declare global {
  interface Window {
    TEALINA_VDOC_CONFIG: import('tealina-doc-ui').TealinaVdocWebConfig
  }
}
