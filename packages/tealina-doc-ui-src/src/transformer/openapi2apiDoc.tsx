import type { ApiDoc, DocItem, DocNode, Entity } from '@tealina/doc-types'
import { DocKind, kStatusCodeKey, kStatusResKey } from '@tealina/doc-types'
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'

const kApplicationJson = 'application/json'
const kTextPlain = 'text/plain'
const kMultipartForm = 'multipart/form-data'
type ApiRefs = Pick<ApiDoc, 'enumRefs' | 'entityRefs' | 'tupleRefs'>
export function openApi2apiDoc(
  doc: OpenAPIV3_1.Document,
  baseURL: string,
): ApiDoc {
  const { schemas = {}, responses = {} } = doc.components ?? {}
  const allSchemas = [
    ...Object.keys(schemas).map(k => `#/components/schemas/${k}`),
    ...Object.keys(responses).map(k => `#/components/responses/${k}`),
  ]
  const refs: ApiRefs = {
    entityRefs: {},
    enumRefs: {},
    tupleRefs: {}
  }
  const { entityRefs } = refs
  let i = 0
  const collectEntity = (schema: OpenAPIV3_1.SchemaObject): void => {
    const name = allSchemas[i].split('/').pop() ?? '{ }'
    const properties = schema.properties ?? {}
    entityRefs[i] = {
      name,
      props: Object.entries(properties).map(([name, schema]) => {
        return {
          name,
          ...schema2docNode(doc, schema, allSchemas, refs),
        }
      }),
      comment: schema.description,
    }
    i++
  }
  Object.values(schemas).map(collectEntity)
  Object.values(responses).map(collectEntity)
  const reqbody2bodynode = (
    requestBody: OpenAPIV3_1.OperationObject['requestBody'],
  ): Pick<DocItem, 'body'> => {
    if (requestBody == null) return {}
    if ('content' in requestBody) {
      if (requestBody.content[kApplicationJson]) {
        return {
          body: schema2docNode(
            doc,
            requestBody.content[kApplicationJson].schema!,
            allSchemas,
            refs,
          ),
        }
      }
      if (requestBody.content[kMultipartForm]) {
        return {
          body: schema2docNode(
            doc,
            requestBody.content[kMultipartForm].schema!,
            allSchemas,
            refs,
          ),
        }
      }
      return {}
    }
    return {
      body: schema2docNode(
        doc,
        requestBody as unknown as OpenAPIV3_1.ReferenceObject,
        allSchemas,
        refs,
      ),
    }
  }
  const kStartsWithPattern = /^2/
  const res2responseNode = (
    response: OpenAPIV3_1.OperationObject['responses'],
  ): Pick<DocItem, 'response'> => {
    if (response == null) return {}
    const statusList = Object.keys(response)
    const nodes: DocNode[] = []
    for (const status of statusList) {
      const res = response[status]
      const uniNode: DocNode = {
        kind: DocKind.LiteralObject, props: [
          { kind: DocKind.NumberLiteral, value: Number(status), name: kStatusCodeKey },
        ],
      }
      if ('$ref' in res) {
        const node = schema2docNode(doc, res, allSchemas, refs)
        if (node.kind === DocKind.LiteralObject && node.props.length === 0) {
          uniNode.props.push(
            { kind: DocKind.StringLiteral, value: node.comment ?? "", name: kStatusResKey }
          )
        } else {
          uniNode.props.push({ ...node, name: kStatusResKey })
        }
        nodes.push(uniNode)
        continue
      }
      if (res.content != null) {
        if (res.content[kApplicationJson] && kStartsWithPattern.test(status)) {
          const node = schema2docNode(
            doc,
            res.content[kApplicationJson].schema!,
            allSchemas,
            refs
          )
          node.comment = node.comment ?? res.description
          uniNode.props.push({ ...node, name: kStatusResKey })
          nodes.push(
            uniNode
          )
          continue
        }
        if (res.content[kTextPlain]) {
          uniNode.props.push(
            {
              kind: DocKind.Primitive,
              type: 'string',
              comment: 'text/plain',
              name: kStatusResKey
            }
          )
          nodes.push(
            uniNode
          )
          continue
        }
      }
      uniNode.props.push({ kind: DocKind.StringLiteral, value: res.description, name: kStatusResKey })
      nodes.push(uniNode)
    }
    if (nodes.length === 1) {
      return { response: nodes[0] }
    }
    return { response: { kind: DocKind.Union, types: nodes } }
  }

  const parmasObj2PorpNode = (
    param: OpenAPIV3_1.ParameterObject,
    entiry: Entity,
  ) => {
    const node = schema2docNode(doc, param.schema!, allSchemas, refs)
    entiry.props.push({
      ...node,
      name: param.name,
      ...(param.required ? {} : { isOptional: true }),
    })
  }
  const kHeaders: Map<number, Entity> = new Map()
  const prameters2rest = (
    parameters: OpenAPIV3_1.OperationObject['parameters'],
  ): Pick<DocItem, 'headers' | 'params' | 'query'> => {
    if (parameters == null) return {}
    const query: Entity = { name: 'Query', props: [] }
    const headers: Entity = { name: 'Headers', props: [] }
    const params: Entity = { name: 'Parmas', props: [] }
    const deepParse = (element: OpenAPIV3_1.ParameterObject) => {
      switch (element.in) {
        case 'query': {
          parmasObj2PorpNode(element, query)
          break
        }
        case 'path':
          parmasObj2PorpNode(element, params)
          break
        case 'header':
          parmasObj2PorpNode(element, headers)
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
    let tailId = Object.values(entityRefs).length - 1
    const result: Pick<DocItem, 'headers' | 'params' | 'query'> = {}
    if (headers.props.length > 0) {
      const existsingHeaders = [...kHeaders.values()]
      const sameOne = existsingHeaders.find(e => {
        const hProps = headers.props
        if (e.props.length !== hProps.length) return false
        for (const prop of e.props) {
          const sameName = hProps.find(h => h.name === prop.name)
          if (sameName == null) return false
          if (sameName.isOptional !== prop.isOptional) return false
        }
        return true
      })
      if (sameOne == null) {
        tailId += 1
        entityRefs[tailId] = headers
        kHeaders.set(tailId, headers)
        result.headers = { kind: DocKind.EntityRef, id: tailId }
      }
    }
    if (query.props.length > 0) {
      tailId += 1
      entityRefs[tailId] = query
      result.query = { kind: DocKind.EntityRef, id: tailId }
    }
    if (params.props.length > 0) {
      tailId += 1
      entityRefs[tailId] = params
      result.params = { kind: DocKind.EntityRef, id: tailId }
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
      apis[method][key] = {
        ...res2responseNode(obj.responses),
        ...reqbody2bodynode(obj.requestBody),
        ...prameters2rest(obj.parameters),
        comment: obj.description ?? obj.summary
      }
    })
  })
  return { apis, docTypeVersion: 1.0, ...refs }
}

function extraMetaInfo(schema: OpenAPIV3_1.SchemaObject) {
  return {
    comment: schema.description,
    jsDoc: {
      default: schema.default,
      format: schema.format,
    },
  }
}

function _schema2docNodeCore(
  doc: OpenAPIV3_1.Document,
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  allSchems: string[],
  refs: ApiRefs,
  parsingList: OpenAPIV3_1.SchemaObject[] = []
): DocNode {
  if ('$ref' in schema) {
    const id = allSchems.indexOf(schema.$ref)
    if (id === -1) {
      return { kind: DocKind.Never }
    }
    //to ref object
    if (parsingList.includes(schema)) {
      return { kind: DocKind.RecursionEntity, id, ...extraMetaInfo(schema) }
    }
    const keys = schema.$ref.split('/').slice(1)
    const entity = keys.reduce(
      (acc, cur) => acc[cur as keyof typeof acc] as any,
      doc,
    ) as OpenAPIV3_1.SchemaObject
    if (entity.type !== 'object') {
      return schema2docNode(doc, entity, allSchems, refs, parsingList)
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
              schema2docNode(doc, v, allSchems, refs, parsingList),
            ),
          },
          ...extraMetaInfo(schema),
        }
      } else {
        const isUnknowType = Object.keys(schema.items).length <= 0
        result = {
          kind: DocKind.Array,
          element: isUnknowType ?
            { kind: DocKind.Primitive, type: 'unknow' }
            : schema2docNode(doc, schema.items, allSchems, refs, parsingList),
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
            memberId: i
          })),
          name: '',// empty string tells the render funtion it canbe render directly
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
            memberId: i
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
            allSchems,
            refs,
            parsingList,
          ),
          ...extraMetaInfo(schema),
        }
        parsingList.pop()
        return result
      }
      if (schema.properties) {
        const requiredList = schema.required ?? []
        return {
          kind: DocKind.LiteralObject,
          props: Object.entries(schema.properties).map(
            ([name, _nestSchema]) => {
              return {
                name,
                ...schema2docNode(doc, _nestSchema, allSchems, refs, parsingList),
                ...(requiredList.includes(name) ? {} : { isOptional: true })
              }
            },
          ),
          ...extraMetaInfo(schema),
        }
      }
      return {
        kind: DocKind.NonLiteralObject,
        type: schema.title ?? '_Unkown_Object',
        ...extraMetaInfo(schema),
      }

    default: {
      const { oneOf, allOf, anyOf } = schema

      parsingList.push(schema)
      let result: DocNode
      if (oneOf != null) {
        result = {
          kind: DocKind.Union,
          types: oneOf.map(v => schema2docNode(doc, v, allSchems, refs, parsingList)),
        } // Union
      } else if (allOf != null) {
        result = {
          kind: DocKind.Tuple,
          elements: allOf.map(v =>
            schema2docNode(doc, v, allSchems, refs, parsingList),
          ),
        } // Union
      } else if (anyOf != null) {
        result = {
          kind: DocKind.Union,
          types: anyOf.map(v => schema2docNode(doc, v, allSchems, refs, parsingList)),
        } // Union
      } else if (Object.keys(schema).length > 0) {
        result = { kind: DocKind.LiteralObject, props: [], ...extraMetaInfo(schema) }
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
  schema: OpenAPIV3.BaseSchemaObject | OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  allSchems: string[],
  refs: ApiRefs,
  parsingList: OpenAPIV3_1.SchemaObject[] = [],
): DocNode {
  let node: DocNode;
  let isNullable = 'nullable' in schema;
  if ('$ref' in schema) {
    const names = schema.$ref.split('/').slice(2)
    const target = names.reduce((obj, key) => obj?.[key as keyof {}], doc.components ?? {})
    isNullable = ('nullable' in target && target.nullable as boolean)
  }
  if (isNullable) {
    node = {
      kind: DocKind.Union, types: [
        { kind: DocKind.Primitive, type: 'null' },
        _schema2docNodeCore(doc, schema, allSchems, refs, parsingList)
      ]
    }
  } else {
    node = _schema2docNodeCore(doc, schema, allSchems, refs, parsingList)
  }
  if ('deprecated' in schema) {
    node.jsDoc = { ...(node.jsDoc ?? {}), deprecated: '' }
  }
  return node
}
