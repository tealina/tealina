const matchers = require('@testing-library/jest-dom/matchers')
import { cleanup } from '@testing-library/react'
import { afterEach, expect, vi } from 'vitest'
import 'vitest-canvas-mock'
import { VDOC_CONFIG } from './mockConfig'
expect.extend(matchers)

//https://github.com/vitest-dev/vitest/issues/821
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'TEALINA_VDOC_CONFIG', {
  writable: true,
  value: VDOC_CONFIG,
})

afterEach(() => {
  cleanup()
})
