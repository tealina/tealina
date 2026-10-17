import { afterEach, expect, test, vi } from 'vite-plus/test'
import { catchError } from '../../src/utils/catchError'

const originalExitCode = process.exitCode

afterEach(() => {
  process.exitCode = originalExitCode
})

test('catch async error', async () => {
  const mock = 'error message'
  const asyncFn = async () =>
    new Promise((res, rej) => {
      rej(mock)
    })
  const logSpy = vi.fn(() => {})
  await catchError(asyncFn, logSpy)
  expect(logSpy).toHaveBeenCalled()
  expect(process.exitCode).eq(1)
})

test('catch sync error', async () => {
  const mock = 'error message'
  const syncFn = () => {
    throw mock
  }
  const logSpy = vi.fn(() => {})
  catchError(syncFn, logSpy)
  expect(logSpy).toHaveBeenCalled()
  expect(process.exitCode).eq(1)
})
