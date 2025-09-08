import { expectTypeOf, test } from 'vitest'
import { Extract2xxResponse, WithStatus } from '../index.js'

test('test types', () => {
  type TestCases =
    | WithStatus<200, 'OK'>
    | WithStatus<201, 'Created'>
    | WithStatus<404, 'Not Found'>
    | WithStatus<500, 'Internal Error'>
    | WithStatus<299, 'Custom Success'>
  type SuccessResponses = Extract2xxResponse<TestCases>
  let result = '' as SuccessResponses
  expectTypeOf(result).toMatchTypeOf<'OK' | 'Created' | 'Custom Success'>()
})
