import { DocKind } from '@tealina/doc-types'
import { fireEvent, render } from '@testing-library/react'
import '@vitest/web-worker'
import { Button, Form } from 'antd'
import { describe, expect, test } from 'vitest'
import { prop2item } from '../../src/transformer/prop2item'

const EmptyDeps = {
  enumRefs: {},
  entityRefs: {},
  tupleRefs: {},
}
describe('test prop to form item', () => {
  test('basic', () => {
    const item = prop2item(EmptyDeps, {
      name: 'age',
      type: 'number',
      kind: DocKind.Primitive,
    })
    const ui = render(<Form> {item}</Form>)
    const ageInput = ui.container.querySelector('input#age')
    // console.log(ageInput?.outerHTML)
    expect(ageInput).toBeInTheDocument()
    // console.log(ui.container.innerHTML)
  })

  test('primitive whith invalid initial value', async () => {
    const numberItem = prop2item(EmptyDeps, {
      name: 'age',
      type: 'number',
      kind: DocKind.Primitive,
      jsDoc: { default: 'autoincrement()' },
    })
    const number2Item = prop2item(EmptyDeps, {
      name: 'level',
      type: 'number',
      kind: DocKind.Primitive,
      jsDoc: { default: '3' },
    })
    const bigValue = 9007199254740991n
    const bigintItem = prop2item(EmptyDeps, {
      name: 'price',
      type: 'bigInt',
      kind: DocKind.Primitive,
      jsDoc: {
        default: '0x1fffffffffffff',
      },
    })
    let values: any = null
    const handleSubmit = (input: any) => {
      console.log('fire')
      values = input
    }
    const App = () => {
      const [form] = Form.useForm()
      return (
        <Form form={form}>
          {numberItem},{number2Item},{bigintItem},
          <Button
            onClick={() => {
              handleSubmit(form.getFieldsValue())
            }}
          ></Button>
        </Form>
      )
    }
    const ui = render(<App />)
    const btn = Array.from(ui.container.querySelectorAll('button')).at(-1)!
    fireEvent.click(btn)
    console.log(values)
    expect(values).toMatchObject({ age: undefined, level: 3, price: bigValue })
  })

  test('primitive whith initial value', async () => {
    const isOkItem = prop2item(EmptyDeps, {
      name: 'isOk',
      type: 'boolean',
      kind: DocKind.Primitive,
    })
    const isFineItem = prop2item(EmptyDeps, {
      name: 'isFine',
      type: 'boolean',
      kind: DocKind.Primitive,
      jsDoc: { default: 'true' },
    })
    let values: any = null
    const handleSubmit = (input: any) => {
      console.log('fire')
      values = input
    }
    const App = () => {
      const [form] = Form.useForm()
      return (
        <Form form={form}>
          {isOkItem},{isFineItem},
          <Button
            onClick={() => {
              handleSubmit(form.getFieldsValue())
            }}
          ></Button>
        </Form>
      )
    }
    const ui = render(<App />)
    const btn = Array.from(ui.container.querySelectorAll('button')).at(-1)!
    fireEvent.click(btn)
    expect(values).toMatchObject({ isOk: false, isFine: true })
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
