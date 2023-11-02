import { expect, test } from 'vitest'
import { workflow } from '../../src/commands/gpure'

const snapshot = [
  '/**  public comment */',
  'interface UserCreateInput{',
  '  /** @default {autoincrement()} */',
  '  id?: number',
  '  /** @default {now()} */',
  '  createdAt?: number',
  '  /**  inline public comment */',
  '  email?: string',
  '  name?: string',
  '}',
  '',
  '/**  public comment */',
  'interface UserUpdateInput{',
  '  /** @default {autoincrement()} */',
  '  id?: number',
  '  /** @default {now()} */',
  '  createdAt?: number',
  '  /**  inline public comment */',
  '  email?: string',
  '  name?: string',
  '  /** @default {USER} */',
  '  role?: any',
  '}',
  '',
  'interface PostCreateInput{',
  '  /** @default {autoincrement()} */',
  '  id?: number',
  '  /** @default {now()} */',
  '  createdAt?: number',
  '  updatedAt?: number',
  '  /** @default {false} */',
  '  published?: boolean',
  '  title: string',
  '  authorId?: number',
  '}',
  '',
  'interface PostUpdateInput{',
  '  /** @default {autoincrement()} */',
  '  id?: number',
  '  /** @default {now()} */',
  '  createdAt?: number',
  '  updatedAt?: number',
  '  /** @default {false} */',
  '  published?: boolean',
  '  title?: string',
  '  authorId?: number',
  '}',
  '',
  '/**',
  '* Enums',
  '*/',
  '// Based on',
  '// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275',
  '',
  'export const Role: {',
  '  USER: "USER"',
  '  ADMIN: "admin"',
  '}',
  'export type Role = (typeof Role)[keyof typeof Role]',
  '',
]

test('relation database', async () => {
  const result = await workflow('test/utils/mock/mock.prisma', {
    typeRemap: t => (t == 'DateTime' ? 'number' : null),
    overwrite: {
      excludeProps: [
        {
          blockName: 'User',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'role',
        },
      ],
      isOptional: [
        {
          blockName: 'User',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'email',
        },
      ],
    },
  })
  expect(result).deep.eq(snapshot)
})
