import { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = any> extends TestingLibraryMatchers<T, any> {}
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<any, any> {}
}
