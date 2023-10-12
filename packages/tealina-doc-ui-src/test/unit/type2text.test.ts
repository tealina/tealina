import { describe, expect, test } from 'vitest'
import { type2text } from '../../src/transformer/type2text'
import {
  ArrayType,
  DocKind,
  Entity,
  EnumEntity,
  EnumMemberRefType,
  EnumRefType,
  NumberLiteral,
  PrimitiveType,
  RecordType,
  RefType,
  StringLiteral,
  TupleType,
  UnionType,
} from '@tealina/doc-types'

const emptyContext = { enumRefs: {}, entityRefs: {}, tupleRefs: {} }

describe('test render fn type2text', () => {
  test('Primitive & Never', () => {
    const input = {
      kind: DocKind.Primitive,
      type: 'string',
    }
    const result = type2text(input, emptyContext)
    expect(result).eq('string')
    expect(type2text({ kind: DocKind.Never }, emptyContext)).eq('never')
  })

  test('NonLiteralObject', () => {
    const input = {
      kind: DocKind.NonLiteralObject,
      type: 'File',
    }
    const result = type2text(input, emptyContext)
    expect(result).eq('File')
  })

  test('Record', () => {
    const keyNode = {
      kind: DocKind.Primitive,
      type: 'string',
    }
    const valNode = {
      kind: DocKind.Primitive,
      type: 'any',
    }
    const input: RecordType = {
      kind: DocKind.Record,
      key: keyNode,
      value: valNode,
    }
    const result = type2text(input, emptyContext)
    expect(result).eq('Record<string, any>')
  })

  test('Union & StringLiteral & NumberLiteral', () => {
    const firstNode: StringLiteral = {
      kind: DocKind.StringLiteral,
      value: 'Male',
    }
    const secondNode: NumberLiteral = {
      kind: DocKind.NumberLiteral,
      value: 1,
    }
    const input: UnionType = {
      kind: DocKind.Union,
      id: 1,
      types: [firstNode, secondNode],
    }
    const result = type2text(input, emptyContext)
    expect(result).eq('Male | 1')
  })

  test('Tuple', () => {
    const firstNode: PrimitiveType = {
      kind: DocKind.Primitive,
      type: 'number',
    }
    const secondNode: PrimitiveType = {
      kind: DocKind.Primitive,
      type: 'string',
    }
    const input: TupleType = {
      kind: DocKind.Tuple,
      elements: [firstNode, secondNode],
    }
    const result = type2text(input, emptyContext)
    expect(result).eq('[number, string]')
  })

  test('Array Primitive', () => {
    const firstNode: PrimitiveType = {
      kind: DocKind.Primitive,
      type: 'number',
    }
    const input: ArrayType = {
      kind: DocKind.Array,
      element: firstNode,
    }
    const result = type2text(input, emptyContext)
    expect(result).eq('number[ ]')
  })

  test('Ref', () => {
    const entity: Entity = {
      name: 'User',
      props: [{ name: 'age', kind: DocKind.Primitive, type: 'nubmer' }],
    }
    const firstNode: RefType = {
      kind: DocKind.EntityRef,
      id: 1,
    }
    const input: ArrayType = {
      kind: DocKind.Array,
      element: firstNode,
    }
    const result = type2text(input, {
      entityRefs: { 1: entity },
      enumRefs: {},
      tupleRefs: {},
    })
    expect(result).eq('User[ ]')
  })

  test('EnumRef', () => {
    const enumEntity: EnumEntity = {
      name: 'LevelType',
      members: [
        {
          memberId: 1,
          key: 'Hight',
          value: { kind: DocKind.StringLiteral, value: 'Hight' },
        },
      ],
    }
    const input: EnumRefType = {
      kind: DocKind.EnumRef,
      id: 1,
    }
    const result = type2text(input, {
      entityRefs: {},
      enumRefs: { 1: enumEntity },
      tupleRefs: {},
    })
    expect(result).eq('LevelType')
  })

  test('MemberRef', () => {
    const enumEntity: EnumEntity = {
      name: 'User',
      members: [
        {
          memberId: 1,
          key: 'Hight',
          value: { kind: DocKind.StringLiteral, value: 'Hight' },
        },
      ],
    }
    const input: EnumMemberRefType = {
      kind: DocKind.EnumMemberRef,
      memberId: enumEntity.members[0].memberId,
      enumId: 1,
    }
    const result = type2text(input, {
      tupleRefs: {},
      entityRefs: {},
      enumRefs: { 1: enumEntity },
    })
    expect(result).eq('Hight')
  })
})
