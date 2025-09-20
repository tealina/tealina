import type { ApiDoc, DocItem, DocNode, Entity, LiteralEntity, PropType, ResponseEntity } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'

const kApplicationJson = 'application/json'
const kMultipartForm = 'multipart/form-data'
type ApiRefs = Pick<ApiDoc, 'enumRefs' | 'entityRefs' | 'tupleRefs'>
export function openApi2apiDoc(
  doc: OpenAPIV3_1.Document,
  baseURL: string,
): ApiDoc {
  const refIdMap: Map<string, number> = new Map()
  const refs: ApiRefs = {
    entityRefs: {},
    enumRefs: {},
    tupleRefs: {},
  }
  const { entityRefs } = refs
  const collectEntity = (): void => {
    for (const [ref, id] of refIdMap) {
      const name = ref.split('/').pop() ?? '{ }'
      const schema = getEntityFromRef(ref, doc)
      const properties = schema.properties ?? {}
      entityRefs[id] = {
        name,
        props: Object.entries(properties).map(([name, schema]) => {
          return {
            name,
            ...schema2docNode(doc, schema, refIdMap, refs),
          }
        }),
        comment: schema.description,
      }
    }
  }
  const reqbody2bodynode = (
    requestBody: OpenAPIV3_1.OperationObject['requestBody'], examples: NonNullable<DocItem['examples']>,
  ): Pick<DocItem, 'body'> => {
    if (requestBody == null) return {}
    if ('content' in requestBody) {
      if (requestBody.content[kApplicationJson]) {
        const obj = requestBody.content[kApplicationJson]
        examples.body = collectExamples(obj)
        return {
          body: schema2docNode(
            doc,
            obj.schema!,
            refIdMap,
            refs,
          ),
        }
      }
      if (requestBody.content[kMultipartForm]) {
        return {
          body: schema2docNode(
            doc,
            requestBody.content[kMultipartForm].schema!,
            refIdMap,
            refs,
          ),
        }
      }
      //TODO: support more media type
      return {}
    }
    return {
      body: schema2docNode(
        doc,
        requestBody as unknown as OpenAPIV3_1.ReferenceObject,
        refIdMap,
        refs,
      ),
    }
  }
  const res2responseNode = (
    response: OpenAPIV3_1.OperationObject['responses'],
    examplesContainer: NonNullable<DocItem['examples']>
  ): Pick<DocItem, 'response'> => {
    if (response == null) return {}
    const statusList = Object.keys(response)
    const nodes: ResponseEntity[] = []
    for (const status of statusList) {
      const res = response[status]
      const baisc: Pick<ResponseEntity, 'kind' | 'statusCode' | 'headers'> = {
        kind: DocKind.ResponseEntity,
        statusCode: Number(status),
      }

      if ('$ref' in res) {
        const node = schema2docNode(doc, res, refIdMap, refs)
        nodes.push({
          ...baisc,
          response: node
        })
        continue
      }
      if (res.headers) {
        // examplesContainer.resHeaders = collectExamples(obj)
        baisc.headers = {
          kind: DocKind.LiteralObject,
          props: Object.entries(res.headers).map(([name, prop]) => {
            const t = '$ref' in prop ? prop : prop.schema!
            return {
              name,
              ...schema2docNode(
                doc,
                t,
                refIdMap,
                refs,
              )
            }
          })
        }
      }
      if (res.content != null) {
        const contentNodes = Object.entries(res.content).map(([contentType, obj]) => {
          examplesContainer.response = collectExamples(obj)
          if (obj.schema) {
            return schema2docNode(
              doc,
              obj.schema,
              refIdMap,
              refs,
            )
          }
          return {
            kind: DocKind.Primitive,
            type: 'string',
            comment: contentType,
          }
        })
        if (contentNodes.length > 1) {
          return {
            ...baisc,
            response: { kind: DocKind.Union, types: contentNodes }
          }
        }
        return {
          ...baisc,
          response: contentNodes[0]
        }
      }
      if (nodes.length == 0) {
        nodes.push({
          ...baisc,
          response: { kind: DocKind.StringLiteral, value: res.description }
        })
      }
    }
    if (nodes.length === 1) {
      return { response: nodes[0] }
    }
    return { response: { kind: DocKind.Union, types: nodes } }
  }

  const parmasObj2PorpNode = (
    param: OpenAPIV3_1.ParameterObject,
  ): PropType => {
    const node = schema2docNode(doc, param.schema!, refIdMap, refs)
    return ({
      ...node,
      name: param.name,
      ...(param.required ? {} : { isOptional: true }),
      comment: node.comment ?? param.description
    })
  }
  const prameters2rest = (
    parameters: OpenAPIV3_1.OperationObject['parameters'], examples: NonNullable<DocItem['examples']>,
  ): Pick<DocItem, 'headers' | 'params' | 'query'> => {
    if (parameters == null) return {}
    const queryProps: PropType[] = []
    const headersProps: PropType[] = []
    const paramsProps: PropType[] = []
    const queryExample: Record<string, any> = {}
    const paramsExample: Record<string, any> = {}
    const headersExample: Record<string, any> = {}
    const deepParse = (element: OpenAPIV3_1.ParameterObject) => {
      switch (element.in) {
        case 'query': {
          queryExample[element.name] = collectExamples(element)
          queryProps.push(parmasObj2PorpNode(element))
          break
        }
        case 'path':
          paramsExample[element.name] = collectExamples(element)
          paramsProps.push(parmasObj2PorpNode(element))
          break
        case 'header':
          headersExample[element.name] = collectExamples(element)
          headersProps.push(parmasObj2PorpNode(element))
          break
      }
    }
    for (const element of parameters) {
      if ('$ref' in element) {
        const key = element.$ref.split('/').pop()!
        const entity = doc.components!.parameters![key]
        deepParse(entity as OpenAPIV3_1.ParameterObject)
        continue
      }
      deepParse(element)
    }
    if (Object.keys(queryExample).length > 0) {
      examples.query = queryExample
    }
    if (Object.keys(paramsExample).length > 0) {
      examples.query = paramsExample
    }
    if (Object.keys(headersExample).length > 0) {
      examples.query = headersExample
    }
    const result: Pick<DocItem, 'headers' | 'params' | 'query'> = {}
    if (headersProps.length > 0) {
      result.headers = { kind: DocKind.LiteralObject, props: headersProps }
    }
    if (queryProps.length > 0) {
      result.query = { kind: DocKind.LiteralObject, props: queryProps }
    }
    if (paramsProps.length > 0) {
      result.params = { kind: DocKind.LiteralObject, props: paramsProps }
    }
    return result
  }

  const apis: ApiDoc['apis'] = {}
  Object.entries(doc.paths ?? {}).map(([url, items]) => {
    Object.entries(items!).map(([method, operationObj]) => {
      const obj = operationObj as OpenAPIV3_1.OperationObject
      if (apis[method] == null) {
        apis[method] = {}
      }
      const key = url.replace(baseURL, '')
      if (apis[method][key] == null) {
        apis[method][key] = {}
      }
      const examples = {} as NonNullable<DocItem['examples']>
      apis[method][key] = {
        ...res2responseNode(obj.responses, examples),
        ...reqbody2bodynode(obj.requestBody, examples),
        ...prameters2rest(obj.parameters, examples),
        comment: obj.description ?? obj.summary,
        examples,
      }
    })
  })
  collectEntity()
  return { apis, docTypeVersion: 1.0, ...refs }
  function collectExamples(obj: OpenAPIV3_1.MediaTypeObject) {
    const list = []
    if (obj.example) {
      if (obj.examples == null) return obj.example
      list.push({ key: 'default', value: getAcutalExample(obj.example, doc) })
    }
    if (obj.examples) {
      const examples = Object.entries(obj.examples).map(([key, value]) => ({ key, ...getAcutalExample(value, doc) }))
      list.push(...examples)
    }
    if (list.length <= 0) return
    return list
  }
}

function extraMetaInfo(schema: OpenAPIV3_1.SchemaObject) {
  return {
    comment: schema.description,
    jsDoc: {
      default: schema.default,
      format: schema.format,
      example: schema.example
    },
  }
}

function getRefId(refIdMap: Map<string, number>, ref: string) {
  let id = refIdMap.get(ref)
  if (id == null) {
    id = refIdMap.size + 1
    refIdMap.set(ref, id)
  }
  return id
}

function _schema2docNodeCore(
  doc: OpenAPIV3_1.Document,
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  refIdMap: Map<string, number>,
  refs: ApiRefs,
  parsingList: OpenAPIV3_1.SchemaObject[] = [],
): DocNode {
  if ('$ref' in schema) {
    const id = getRefId(refIdMap, schema.$ref)
    if (id === -1) {
      return { kind: DocKind.Never }
    }
    //to ref object
    if (parsingList.includes(schema)) {
      return { kind: DocKind.RecursionEntity, id, ...extraMetaInfo(schema) }
    }
    const entity = getEntityFromRef(schema.$ref, doc)
    if (entity.type !== 'object') {
      return schema2docNode(doc, entity, refIdMap, refs, parsingList)
    }
    return { id: id, kind: DocKind.EntityRef, ...extraMetaInfo(schema) }
  }
  switch (schema.type) {
    case 'array': {
      parsingList.push(schema)
      let result: DocNode
      if ('oneOf' in schema) {
        result = {
          kind: DocKind.Array,
          element: {
            kind: DocKind.Tuple,
            elements: schema.oneOf!.map(v =>
              schema2docNode(doc, v, refIdMap, refs, parsingList),
            ),
          },
          ...extraMetaInfo(schema),
        }
      } else {
        const isUnknowType = Object.keys(schema.items).length <= 0
        result = {
          kind: DocKind.Array,
          element: isUnknowType
            ? { kind: DocKind.Primitive, type: 'unknow' }
            : schema2docNode(doc, schema.items, refIdMap, refs, parsingList),
          ...extraMetaInfo(schema),
        }
      }
      parsingList.pop()
      return result
    }
    case 'boolean':
      return {
        kind: DocKind.Primitive,
        type: 'boolean',
        ...extraMetaInfo(schema),
      }
    case 'integer':
    case 'number':
      if (schema.enum != null) {
        const enumId = Object.keys(refs.enumRefs).length + 1
        refs.enumRefs[enumId] = {
          members: schema.enum.map((v, i) => ({
            key: v,
            value: { kind: DocKind.NumberLiteral, value: v },
            memberId: i,
          })),
          name: '', // empty string tells the render funtion it canbe render directly
        }
        return {
          kind: DocKind.EnumRef,
          id: enumId,
          ...extraMetaInfo(schema),
        }
      }
      return {
        kind: DocKind.Primitive,
        type: 'number',
        ...extraMetaInfo(schema),
      }
    case 'string':
      if (schema.format === 'binary') {
        return {
          kind: DocKind.NonLiteralObject,
          type: schema.title ?? 'File',
          ...extraMetaInfo(schema),
        }
      }
      if (schema.enum != null) {
        const enumId = Object.keys(refs.enumRefs).length + 1
        refs.enumRefs[enumId] = {
          members: schema.enum.map((v, i) => ({
            key: v,
            value: { kind: DocKind.StringLiteral, value: v },
            memberId: i,
          })),
          name: schema.title ?? '',
        }
        return {
          kind: DocKind.EnumRef,
          id: enumId,
          ...extraMetaInfo(schema),
        }
      }
      return {
        kind: DocKind.Primitive,
        type: 'string',
        ...extraMetaInfo(schema),
      }
    case 'null':
      return { kind: DocKind.Primitive, type: 'null', ...extraMetaInfo(schema) }

    case 'object':
      if (schema.properties) {
        const requiredList = schema.required ?? []
        //todo: may had additionalProperties
        return {
          kind: DocKind.LiteralObject,
          props: Object.entries(schema.properties).map(
            ([name, _nestSchema]) => {
              return {
                name,
                ...schema2docNode(
                  doc,
                  _nestSchema,
                  refIdMap,
                  refs,
                  parsingList,
                ),
                ...(requiredList.includes(name) ? {} : { isOptional: true }),
              }
            },
          ),
          ...extraMetaInfo(schema),
        }
      } else {
        if (schema.additionalProperties) {
          if (schema.additionalProperties === true) {
            return {
              kind: DocKind.Record,
              key: { kind: DocKind.Primitive, type: 'string' },
              value: { kind: DocKind.Primitive, type: 'unknow' },
              ...extraMetaInfo(schema),
            }
          }
          parsingList.push(schema)
          const result = {
            kind: DocKind.Record,
            key: { kind: DocKind.Primitive, type: 'string' },
            value: schema2docNode(
              doc,
              schema.additionalProperties,
              refIdMap,
              refs,
              parsingList,
            ),
            ...extraMetaInfo(schema),
          }
          parsingList.pop()
          return result
        }
      }
      if ('title' in schema) {
        return {
          kind: DocKind.NonLiteralObject,
          type: schema.title ?? '_Unkown_Object',
          ...extraMetaInfo(schema),
        }
      }
      return {
        kind: DocKind.LiteralObject,
        props: [],
        ...extraMetaInfo(schema),
      }

    default: {
      const { oneOf, allOf, anyOf } = schema

      parsingList.push(schema)
      let result: DocNode
      if (oneOf != null) {
        result = {
          kind: DocKind.Union,
          types: oneOf.map(v =>
            schema2docNode(doc, v, refIdMap, refs, parsingList),
          ),
        } // Union
      } else if (allOf != null) {
        const nodes = allOf.map(v =>
          schema2docNode(doc, v, refIdMap, refs, parsingList),
        )
        if (nodes.length == 1) return nodes[0]
        const names: string[] = []
        const props: PropType[] = []
        const getObjType = (n: DocNode) => {
          if (n.kind == DocKind.LiteralObject) return n
          if (n.kind === DocKind.EntityRef) {
            const entity = refs.entityRefs[n.id]
            return entity
          }
        }
        const allObjects = nodes.map(n => {
          if (n.kind === DocKind.Union) {
            return n.types.map(getObjType)
          }
          return getObjType(n)
        }).flat().filter(v => v != null)
        for (const n of allObjects) {
          if (n.name != null) {
            names.push(n.name)
            props.push(...n.props)
            continue
          }
          const [firstPorp] = n.props
          names.push(`{ ${firstPorp.name}, ...}`)
          props.push(...n.props)
        }
        const mergedEntity: Entity = {
          name: names.join(' & '),
          props,
          comment: schema.description ?? ''
        }
        // const nextId = refIdMap.size + 1
        // refs.entityRefs[nextId] = mergedEntity
        result = {
          kind: DocKind.LiteralObject,
          ...mergedEntity,
        }
      } else if (anyOf != null) {
        result = {
          kind: DocKind.Union,
          types: anyOf.map(v =>
            schema2docNode(doc, v, refIdMap, refs, parsingList),
          ),
        }
      } else if (Object.keys(schema).length > 0) {
        if ('content' in schema) {
          const nodes = Object.entries(schema.content ?? {}).map(([_contentType, obj]) => {
            return schema2docNode(doc, obj, refIdMap, refs, parsingList)
          })
          result = nodes.length > 1 ? { kind: DocKind.Union, types: nodes } : nodes[0]
        } else {
          result = {
            kind: DocKind.StringLiteral,
            value: schema.description ?? '',
            ...extraMetaInfo(schema),
          }
        }
      } else {
        result = { kind: DocKind.Never }
      }
      parsingList.pop()
      return { ...result, ...extraMetaInfo(schema) }
    }
  }

}

export function schema2docNode(
  doc: OpenAPIV3_1.Document,
  docObject:
    | OpenAPIV3.BaseSchemaObject
    | OpenAPIV3_1.SchemaObject
    | OpenAPIV3_1.ReferenceObject
    | OpenAPIV3_1.HeaderObject,
  refIdMap: Map<string, number>,
  refs: ApiRefs,
  parsingList: OpenAPIV3_1.SchemaObject[] = [],
): DocNode {
  let node: DocNode
  let isNullable = 'nullable' in docObject
  if ('$ref' in docObject) {
    const names = docObject.$ref.split('/').slice(2)
    const target = names.reduce(
      (obj, key) => obj?.[key as keyof {}],
      doc.components ?? {},
    )
    isNullable = 'nullable' in target && (target.nullable as boolean)
  }
  const actualSchema = ('schema' in docObject ? docObject.schema! : docObject) as Exclude<typeof docObject, OpenAPIV3_1.HeaderObject>
  if (isNullable) {
    node = {
      kind: DocKind.Union,
      types: [
        { kind: DocKind.Primitive, type: 'null' },
        _schema2docNodeCore(doc, actualSchema, refIdMap, refs, parsingList),
      ],
    }
  } else {
    node = _schema2docNodeCore(doc, actualSchema, refIdMap, refs, parsingList)
  }
  if ('deprecated' in docObject) {
    node.jsDoc = { ...(node.jsDoc ?? {}), deprecated: '' }
  }
  return node
}



function getAcutalExample(obj: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.ExampleObject,
  doc: OpenAPIV3_1.Document) {
  if ('$ref' in obj) {
    return getEntityFromRef(obj.$ref, doc)
  }
  return obj
}

function getEntityFromRef(ref: string, doc: OpenAPIV3_1.Document) {
  const keys = ref.split('/').slice(1)
  const entity = keys.reduce(
    (acc, cur) => acc[cur as keyof typeof acc] as any,
    doc,
  ) as OpenAPIV3_1.SchemaObject
  return entity
}
