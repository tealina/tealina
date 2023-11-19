import { expect, test } from 'vitest'
import { workflow } from '../../src/commands/gpure'

const snapshot = [
  'interface User{',
  '  /** @default {auto()} */',
  '  id: string',
  '  email: string',
  '  name: string | null',
  '  address: Address | null',
  '}',
  '',
  'interface UserCreateInput{',
  '  email: string',
  '  name?: string',
  '  address?: AddressCreateInput',
  '}',
  '',
  'interface UserUpdateInput{',
  '  /** @default {auto()} */',
  '  id?: string',
  '  email?: string',
  '  name?: string',
  '  address?: AddressCreateInput',
  '}',
  '',
  'interface Address{',
  '  street: string',
  '  city: string',
  '  state: string',
  '  zip: string',
  '}',
  '',
  'interface AddressCreateInput{',
  '  street: string',
  '  city: string',
  '  state: string',
  '  zip: string',
  '}',
  '',
  'interface AddressUpdateInput{',
  '  street?: string',
  '  city?: string',
  '  state?: string',
  '  zip?: string',
  '}',
  '',
]
test('mongo database has composite type', async () => {
  const result = await workflow('test/utils/mock/mongo.prisma', {
    typeRemap: t => (t == 'DateTime' ? 'number' : null),
    overwrite: {
      excludeProps: [
        {
          blockName: '*',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'id',
        },
      ],
    },
  })
  expect(result).deep.eq(snapshot)
})
