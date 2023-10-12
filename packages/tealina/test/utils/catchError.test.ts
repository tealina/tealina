import { expect, test, vi } from 'vitest'
import { catchError } from '../../src/utils/catchError'

test('catch async error', async () => {
  const mock = 'error message'
  const asyncFn = async () =>
    new Promise((res, rej) => {
      rej(mock)
    })
  const logSpy = vi.fn(() => {})
  await catchError(asyncFn, logSpy)
  expect(logSpy).toHaveBeenCalled()
})

test('catch sync error', async () => {
  const mock = 'error message'
  const syncFn = () => {
    throw mock
  }
  const logSpy = vi.fn(() => {})
  catchError(syncFn, logSpy)
  expect(logSpy).toHaveBeenCalled()
})
