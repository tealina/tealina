import { expectTypeOf, test } from 'vitest'
import { Extract2xxResponse, WithExtra, WithStatusCode } from '../index.js'

test('test types', () => {
  type TestCases =
    | WithStatusCode<200, 'OK'>
    | WithStatusCode<201, 'Created'>
    | WithStatusCode<404, 'Not Found'>
    | WithStatusCode<500, 'Internal Error'>
    | WithStatusCode<299, 'Custom Success'>
    | WithExtra<{ statusCode: 200; response: 'Oh Ho' }>
  type SuccessResponses = Extract2xxResponse<TestCases>
  let result = '' as SuccessResponses
  expectTypeOf(result).toMatchTypeOf<
    'OK' | 'Created' | 'Custom Success' | 'Oh Ho'
  >()
})
