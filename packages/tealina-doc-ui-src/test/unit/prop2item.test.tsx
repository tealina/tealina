import { render } from '@testing-library/react'
import { DocKind } from '@tealina/doc-types'
import '@vitest/web-worker'
import { describe, expect, test } from 'vitest'
import { prop2item } from '../../src/transformer/prop2item'
import { Form } from 'antd'

describe('test prop to form item', () => {
  test('basic', () => {
    const item = prop2item(
      {
        enumRefs: {},
        entityRefs: {},
        tupleRefs: {},
      },
      { name: 'age', type: 'number', kind: DocKind.Primitive },
    )
    const ui = render(<Form> {item}</Form>)
    const ageInput = ui.container.querySelector('input#age')
    // console.log(ageInput?.outerHTML)
    expect(ageInput).toBeInTheDocument()
    // console.log(ui.container.innerHTML)
  })
  test('recursive object dependence', async () => {
    const item = prop2item(
      {
        enumRefs: {},
        tupleRefs: {},
        entityRefs: {
          1: {
            name: 'ItemType',
            props: [
              { name: 'label', type: 'string', kind: DocKind.Primitive },
              { name: 'value', type: 'string', kind: DocKind.Primitive },
              { name: 'children', kind: DocKind.RecursionEntity, id: 1 },
            ],
          },
        },
      },
      {
        kind: DocKind.EntityRef,
        name: 'options',
        id: 1,
      },
    )
    const ui = render(<Form> {item}</Form>)
    const optionItem = await ui.findByText('options')
    expect(optionItem).toBeInTheDocument()
  })

  test('recursive tuple dependence', async () => {
    const item = prop2item(
      {
        enumRefs: {},
        tupleRefs: {
          3: {
            elements: [
              { kind: DocKind.EntityRef, id: 1 },
              { kind: DocKind.EntityRef, id: 2 },
              { kind: DocKind.RecursionTuple, id: 3 },
            ],
            name: 'RecursiveTuple',
          },
        },
        entityRefs: {
          1: {
            name: 'IOne',
            props: [{ name: 'one', type: 'string', kind: DocKind.Primitive }],
          },
          2: {
            name: 'ITwo',
            props: [{ name: 'two', type: 'number', kind: DocKind.Primitive }],
          },
        },
      },
      {
        kind: DocKind.Tuple,
        name: 'which',
        elements: [
          { kind: DocKind.EntityRef, id: 1 },
          { kind: DocKind.EntityRef, id: 2 },
          { kind: DocKind.RecursionTuple, id: 3 },
        ],
      },
    )
    const ui = render(<Form> {item}</Form>)
    const optionItem = await ui.findByText('which')
    expect(optionItem).toBeInTheDocument()
  })
})
