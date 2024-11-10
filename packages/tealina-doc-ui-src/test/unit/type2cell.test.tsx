import { render } from '@testing-library/react'
import type {
  ArrayType,
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
import { DocKind } from '@tealina/doc-types'

import { describe, expect, test } from 'vitest'
import { LightColors } from '../../src/atoms/themeAtom'
import { type2cell } from '../../src/transformer/type2cell'

const emptyContext = { enumRefs: {}, entityRefs: {}, tupleRefs: {} }
const TypeColors = LightColors
describe('test render fn type2cell', () => {
  test('Primitive & Never', ({ expect }) => {
    const input = {
      kind: DocKind.Primitive,
      type: 'string',
    }
    const Cell4string = type2cell(input, emptyContext)
    const Cell4never = type2cell({ kind: DocKind.Never }, emptyContext)
    const Cell4literalNum = type2cell(
      { kind: DocKind.NumberLiteral, value: 2 },
      emptyContext,
    )
    const Cell4numType = type2cell(
      { kind: DocKind.Primitive, type: 'number' },
      emptyContext,
    )
    const x = render(
      <div>
        {Cell4string}
        {Cell4never}
        {Cell4literalNum}
        {Cell4numType}
      </div>,
    )
    expect(x.getByText('number')).toHaveStyle({ color: TypeColors.number })
    expect(x.getByText('never')).toHaveStyle({ color: TypeColors.any })
    expect(x.getByText('string')).toHaveStyle({ color: TypeColors.string })
    expect(x.getByText('2')).toHaveStyle({ color: TypeColors.number })
  })

  test('NonLiteralObject', () => {
    const input = {
      kind: DocKind.NonLiteralObject,
      type: 'File',
    }
    const CellText = type2cell(input, emptyContext)
    const layout = render(CellText)
    expect(layout.getByText('File')).toHaveStyle({ color: TypeColors.any })
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
    const CellText = type2cell(input, emptyContext)
    const layout = render(CellText)
    //Record<string, any>
    expect(layout.getByText('Record')).toHaveStyle({ color: TypeColors.any })
    expect(layout.getByText('any')).toHaveStyle({ color: TypeColors.any })
    expect(layout.getByText('string')).toHaveStyle({ color: TypeColors.string })
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
    const CellText = type2cell(input, emptyContext)
    const layout = render(CellText)
    //<span><span>"Male"</span><span> | </span><span>1</span></span>
    const firstEl = layout.getByText(`"Male"`)
    expect(firstEl.nextElementSibling?.textContent).eq(' | ')
    expect(firstEl).toHaveStyle({ color: TypeColors.string })
    expect(layout.getByText('1')).toHaveStyle({ color: TypeColors.number })
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
    const CellText = type2cell(input, emptyContext)
    const layout = render(CellText)
    const snapshot = `
    <span class="inline-flex gap-[3px]">
      <span>[</span>
      <span>
        <span style="color: rgb(46, 125, 50);">number</span>
        <span>, </span>
        <span style="color: rgb(190, 85, 42);">string</span>
      </span>
      <span>]</span>
    </span>
    `
    expect(layout.container.innerHTML).eq(
      snapshot
        .split('\n')
        .map(v => v.trim())
        .join(''),
    )
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
    const CellText = type2cell(input, emptyContext)
    const layout = render(CellText)
    const numEl = layout.getByText('number')
    expect(numEl).toBeInTheDocument()
    expect(numEl.nextSibling).toHaveTextContent('[]')
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
    const CellText = type2cell(input, {
      entityRefs: { 1: entity },
      enumRefs: {},
      tupleRefs: {},
    })
    const layout = render(CellText)
    const el = layout.getByText('User')
    expect(el).toBeInTheDocument()
    expect(el.localName).eq('a')
    expect(el).toHaveAttribute('href', `#${firstNode.id}`)
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
    const CellText = type2cell(input, {
      entityRefs: {},
      enumRefs: { 1: enumEntity },
      tupleRefs: {},
    })
    const layout = render(CellText)
    const el = layout.getByText('LevelType')
    expect(el.parentElement).toHaveStyle({ color: TypeColors.any })
    expect(el).toBeInTheDocument()
    expect(el.localName).eq('a')
    expect(el).toHaveAttribute('href', `#${input.id}`)
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
    const CellText = type2cell(input, {
      entityRefs: {},
      enumRefs: { 1: enumEntity },
      tupleRefs: {},
    })
    const layout = render(CellText)
    const el = layout.getByText('Hight')
    expect(el).toBeInTheDocument()
    expect(el).toHaveStyle({ color: TypeColors.enum })
  })
})
