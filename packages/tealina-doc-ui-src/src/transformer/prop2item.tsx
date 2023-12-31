import {
  CloseCircleOutlined,
  MinusOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Col,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Row,
  Segmented,
  Select,
  Switch,
} from 'antd'
import FormItem, { FormItemProps } from 'antd/es/form/FormItem'
import FormList, { FormListFieldData } from 'antd/es/form/FormList'
import useFormInstance from 'antd/es/form/hooks/useFormInstance'
import { InternalNamePath, NamePath } from 'antd/es/form/interface'
import { isEmpty, pickFn } from 'fp-lite'
import { InputHTMLAttributes, ReactNode, useRef, useState } from 'react'
import type {
  ApiDoc,
  DocNode,
  NumberLiteral,
  PropType,
  StringLiteral,
  UnionType,
} from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { CodeEditorItem } from '../components/CodeEditorItem'
import { type2text } from './type2text'

type ScopedDoc = Omit<ApiDoc, 'apis' | 'docTypeVersion'>

const AllNumberPattern = /^\d+$/

const toNumber = (v: null | undefined | string) => {
  if (v == null) return
  const x = v.trim()
  if (AllNumberPattern.test(x)) return Number(x)
}

const toBigInt = (v: null | undefined | string) => {
  if (v == null) return
  try {
    return BigInt(v.trim())
  } catch (error) {}
}

export const prop2item = (
  doc: ScopedDoc,
  prop: PropType,
  preNamepath: InternalNamePath = [],
): any => {
  let wrapperInItem = makeFormItem(prop, preNamepath)
  switch (prop.kind) {
    case DocKind.Array:
      return wrapperInDeepList(
        prop,
        field =>
          prop2item(doc, { ...prop.element, name: field.name as any }, []),
        preNamepath,
      )
    case DocKind.EnumMemberRef:
      const member = doc.enumRefs[prop.enumId].members.find(
        v => v.memberId == prop.memberId,
      )
      return wrapperInItem(
        <Select
          options={[{ label: member?.key, value: member?.value }]}
          disabled
        />,
        { initialValue: member?.value },
      )
    case DocKind.EnumRef:
      const members = doc.enumRefs[prop.id].members
      const isAllLiteral = members.filter(
        m =>
          m.value.kind == DocKind.NumberLiteral ||
          m.value.kind == DocKind.StringLiteral,
      )
      const options = members.map(m => ({
        label: m.key,
        value: (m.value as StringLiteral | NumberLiteral).value,
      }))
      return wrapperInItem(
        <Select options={options} mode={isAllLiteral ? void 0 : 'tags'} />,
      )
    case DocKind.Never:
      return wrapperInItem(<Input placeholder="Never" disabled />)
    case DocKind.NonLiteralObject:
      //may be upload
      //or return a user determate select
      if (prop.type == 'Date') {
        return wrapperInItem(<DatePicker />)
      }
      if (prop.type == 'File') {
        return wrapperInItem(<SimpleUpload accept={prop.jsDoc?.accept} />)
      }
      break
    case DocKind.NumberLiteral:
      return wrapperInItem(<InputNumber value={prop.value} disabled />, {
        initialValue: prop.value,
      })
    case DocKind.Primitive:
      switch (prop.type) {
        case 'string':
          return wrapperInItem(<Input placeholder="string" />, {
            initialValue: prop.jsDoc?.default,
          })
        case 'number':
          return wrapperInItem(<InputNumber placeholder={prop.type} />, {
            initialValue: toNumber(prop.jsDoc?.default),
          })
        case 'bigInt':
          return wrapperInItem(<InputNumber placeholder={prop.type} />, {
            initialValue: toBigInt(prop.jsDoc?.default),
          })
        case 'boolean':
          return wrapperInItem(
            <Switch checkedChildren="true" unCheckedChildren="false" />,
            {
              valuePropName: 'checked',
              initialValue:
                prop.jsDoc?.default != null
                  ? Boolean(prop.jsDoc!.default)
                  : false,
            },
          )
        case 'true':
          return wrapperInItem(
            <Switch checkedChildren="true" checked disabled />,
            {
              valuePropName: 'checked',
              initialValue: true,
            },
          )
        case 'false':
          return wrapperInItem(
            <Switch unCheckedChildren="false" checked={false} disabled />,
            {
              valuePropName: 'checked',
              initialValue: false,
            },
          )
        case 'unknow':
        case 'any':
          return (
            <CodeEditorItem
              preNamepath={preNamepath}
              info={prop}
              hint={type2text(prop, doc)}
              key={[...preNamepath, prop.name].join('.')}
            />
          )
        case 'null':
        case 'void':
          return null
        default:
          return wrapperInItem(<Input placeholder={prop.type} />)
      }
    case DocKind.Record:
      return (
        <CodeEditorItem
          preNamepath={preNamepath}
          info={prop}
          hint={type2text(prop, doc)}
          key={[...preNamepath, prop.name].join('.')}
        />
      )
    case DocKind.EntityRef:
      const nest = doc.entityRefs[prop.id]
      return (
        <FormItem key={[...preNamepath, prop.name].join('.')} noStyle>
          <FormItem
            label={String(prop.name)}
            className="capitalize"
            required={!prop.isOptional}
          />
          <Col offset={1 + preNamepath.length}>
            {nest.props.map(p =>
              prop2item(doc, p, [...preNamepath, prop.name]),
            )}
          </Col>
        </FormItem>
      )
    case DocKind.Union:
      return (
        <UnionFormItemsWrapper
          key={[...preNamepath, prop.name].join('.')}
          prop={prop}
          name={[...preNamepath, prop.name]}
          getText={v => type2text(v, doc)}
          render={v => prop2item(doc, v, preNamepath)}
          getInitialValue={v => collectInitialValue(v, doc)}
        />
      )
    case DocKind.StringLiteral:
      return wrapperInItem(<Input value={prop.value} disabled />, {
        initialValue: prop.value,
      })
    case DocKind.Tuple:
      if (isEmpty(prop.elements)) {
        return (
          <FormItem
            label={String(prop.name)}
            required={!prop.isOptional}
            key={[...preNamepath, prop.name].join('.')}
            normalize={v => (v != 0 ? [] : void 0)}
          >
            {prop.isOptional ? (
              <Segmented
                options={[
                  { label: '[ ]', value: 1 },
                  { label: 'undefined', value: 0 },
                ]}
              />
            ) : (
              <Input value="[ ]" disabled />
            )}
          </FormItem>
        )
      }
      const namePath = [...preNamepath, prop.name]
      return (
        <FormList key={namePath.join('.')} name={namePath}>
          {_fields => (
            <FormItem label={String(prop.name)} required={!prop.isOptional}>
              {prop.elements.map((v, i) =>
                prop2item(doc, { ...v, name: i as any }, []),
              )}
            </FormItem>
          )}
        </FormList>
      )
    case DocKind.RecursionTuple:
    case DocKind.RecursionEntity:
      return (
        <CodeEditorItem
          hint={type2text(prop, doc)}
          info={prop}
          preNamepath={preNamepath}
          key={[...preNamepath, prop.name].join('.')}
        />
      )
  }
}

function wrapperInDeepList(
  prop: PropType,
  buildItems: (field: FormListFieldData) => ReactNode[],
  preNamePath: InternalNamePath = [],
) {
  const namePath = [...preNamePath, prop.name]
  return (
    <FormList name={namePath} key={namePath.join('.')}>
      {(fields, { add, remove }) => (
        <FormItem label={String(prop.name)} required={!prop.isOptional}>
          {fields.map(field => (
            <div className="flex">
              <div className="flex-grow">{buildItems(field)}</div>
              <div>
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => remove(field.name)}
                />
              </div>
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
            Add {prop.name}
          </Button>
        </FormItem>
      )}
    </FormList>
  )
}

const makeFormItem =
  (prop: PropType, preNamePath: InternalNamePath = []) =>
  (child: ReactNode, itemProp?: FormItemProps) => {
    const namePath = [...preNamePath, prop.name]
    return (
      <FormItem
        key={namePath.join('.')}
        label={String(prop.name)}
        name={namePath}
        normalize={v => (v == null ? void 0 : v)}
        rules={
          prop.isOptional
            ? void 0
            : [
                {
                  required: true,
                },
              ]
        }
        {...itemProp}
      >
        {child}
      </FormItem>
    )
  }

function SimpleUpload({
  onChange,
  value,
  ...props
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'multiple' | 'hidden'
> & {
  value?: File
  onChange?: (v?: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const trigglerInputClick = () => {
    const event = new MouseEvent('click')
    inputRef.current?.dispatchEvent(event)
  }
  const updateValue: InputHTMLAttributes<HTMLInputElement>['onChange'] = e => {
    const v = e.target?.files?.[0]
    onChange?.(v)
  }
  if (value == null) {
    return (
      <div>
        <input
          {...props}
          ref={inputRef}
          type="file"
          multiple={false}
          style={{ ...(props.style ?? {}), display: 'none' }}
          onChange={updateValue}
        />
        <Button icon={<UploadOutlined />} onClick={trigglerInputClick}>
          Upload
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <div>{value.name}</div>
      <Button
        icon={<CloseCircleOutlined />}
        onClick={() => {
          onChange?.()
        }}
      />
    </div>
  )
}

function UnionFormItemsWrapper({
  prop,
  render,
  getText,
  name,
  getInitialValue,
}: {
  prop: UnionType & PropType
  render: (single: PropType) => ReactNode
  getText: (single: PropType) => string
  getInitialValue: (single: PropType) => any
  name: NamePath
}) {
  const eachTypeProp = prop.types.map(v =>
    Object.assign({}, v, pickFn(prop, 'name', 'isOptional', 'jsDoc')),
  )
  const [curIndex, setCurIndex] = useState(0)
  const form = useFormInstance()
  return (
    <div>
      <Row key="pick-one">
        <Col offset={2}>
          <Radio.Group
            onChange={e => {
              const nextIndex = e.target.value
              form.setFieldValue(name, getInitialValue(eachTypeProp[nextIndex]))
              setCurIndex(nextIndex)
            }}
            optionType="button"
            options={eachTypeProp.map((v, i) => ({
              label: getText(v),
              value: i,
            }))}
          />
        </Col>
      </Row>
      {render(eachTypeProp[curIndex])}
    </div>
  )
}

const collectInitialValue = (prop: DocNode, doc: ScopedDoc): any => {
  switch (prop.kind) {
    case DocKind.NumberLiteral:
    case DocKind.StringLiteral:
      return prop.value
    case DocKind.Primitive:
      if (prop.type == 'true') return true
      if (prop.type == 'false') return false
      return
    case DocKind.EnumMemberRef:
      const member = doc.enumRefs[prop.enumId].members.find(
        v => v.memberId == prop.memberId,
      )
      return member?.value ?? void 0
    case DocKind.EntityRef:
      const shape = doc.entityRefs[prop.id]
      return Object.fromEntries(
        shape.props.map(p => [p.name, collectInitialValue(p, doc)] as const),
      )
  }
}
