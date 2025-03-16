
import type { ApiDoc, DocItem, DocNode, Entity } from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import type { OpenAPIV3_1 } from 'openapi-types'


const kApplicationJson = 'application/json'
const kTextPlain = 'text/plain'
const kMultipartForm = 'multipart/form-data'
export function openApi2apiDoc(doc: OpenAPIV3_1.Document, baseURL: string): ApiDoc {
  const { schemas = {}, responses = {} } = doc.components ?? {}

  const allSchemas = [...new Set([schemas, responses].flatMap(v => Object.keys(v)))]
  const entityRefs: ApiDoc['entityRefs'] = {}
  Object.values(schemas).map((schema, i) => {
    const name = allSchemas[i].split('/').pop() ?? '{ }'
    const properties = (schema.properties ?? {})
    entityRefs[i] = {
      name,
      props: Object.entries(properties).map(([name, schema]) => {
        return {
          name,
          ...schema2docNode(schema, allSchemas)
        }
      }),
      comment: schema.description
    }
  })
  const reqbody2bodynode = (requestBody: OpenAPIV3_1.OperationObject['requestBody']): Pick<DocItem, 'body'> => {
    if (requestBody == null) return {}
    if ('content' in requestBody) {
      if (requestBody.content[kApplicationJson]) {
        return { body: schema2docNode(requestBody.content[kApplicationJson].schema!, allSchemas) }
      }
      if (requestBody.content[kMultipartForm]) {
        return { body: schema2docNode(requestBody.content[kMultipartForm].schema!, allSchemas) }
      }
      return {}
    }
    return { body: schema2docNode(requestBody as unknown as OpenAPIV3_1.ReferenceObject, allSchemas) }
  }

  const res2responseNode = (response: OpenAPIV3_1.OperationObject['responses']): Pick<DocItem, 'response'> => {
    if (response == null) return {}
    const statusList = Object.keys(response)
    const nodes: DocNode[] = []
    for (const status of statusList) {
      const res = response[status]
      if ('$ref' in res) {
        nodes.push(schema2docNode(res, allSchemas))
        continue
      }
      if (res.content != null) {
        if (res.content[kApplicationJson]) {
          nodes.push(schema2docNode(res.content[kApplicationJson].schema!, allSchemas))
        }
        if (res.content[kTextPlain]) {
          nodes.push({ kind: DocKind.Primitive, type: 'string', comment: 'text/plain' })
        }
      }
    }
    if (nodes.length === 1) {
      return { response: nodes[0] }
    }
    return { response: { kind: DocKind.Union, types: nodes, comment: statusList.join(', ') } }
  }

  const parmasObj2PorpNode = (param: OpenAPIV3_1.ParameterObject, entiry: Entity) => {
    const node = schema2docNode(param.schema!, allSchemas)
    entiry.props.push({
      ...node,
      name: param.name,
      ...(param.required ? { isOptionsal: false } : {})
    })

  }
  const kHeaders: Map<number, Entity> = new Map()
  const prameters2rest = (parameters: OpenAPIV3_1.OperationObject['parameters']): Pick<DocItem, 'headers' | 'params' | 'query'> => {
    if (parameters == null) return {}
    const query: Entity = { name: 'Query', props: [], }
    const headers: Entity = { name: 'Headers', props: [] }
    const params: Entity = { name: 'Parmas', props: [] }
    for (const element of parameters) {
      if ('$ref' in element) {
        continue
      }
      switch (element.in) {
        case 'query': {
          parmasObj2PorpNode(element, query)
          break;
        }
        case 'path':
          parmasObj2PorpNode(element, params)
          break;
        case 'header':
          parmasObj2PorpNode(element, headers)
          break;
      }
    }
    let tailId = Object.values(entityRefs).length
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
      const obj = (operationObj as OpenAPIV3_1.OperationObject)
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
        ...prameters2rest(obj.parameters)
      }
    }
    )
  })
  return { apis, entityRefs, docTypeVersion: 1.0, enumRefs: {}, tupleRefs: {} }
}

export function schema2docNode(
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  allSchems: string[],
  parsingList: OpenAPIV3_1.SchemaObject[] = []
): DocNode {
  if ('$ref' in schema) {
    const namePath = schema.$ref as string
    const actialName = namePath.split('/').pop()!
    const id = allSchems.indexOf(actialName)
    if (id === -1) {
      return { kind: DocKind.Never }
    }
    //to ref object
    if (parsingList.includes(schema)) {
      return { kind: DocKind.RecursionEntity, id }
    }
    return { id: id, kind: DocKind.EntityRef }
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
            elements: schema.oneOf!.map(v => schema2docNode(v, allSchems, parsingList))
          }
        }
      } else {
        result = {
          kind: DocKind.Array,
          element: schema2docNode(schema.items, allSchems, parsingList)
        }
      }
      parsingList.pop()
      return result
    }
    case 'boolean':
      return { kind: DocKind.Primitive, type: 'boolean' }
    case 'integer':
    case 'number':
      if (schema.enum != null) {
        return { kind: DocKind.NumberLiteral, value: schema.enum[0] }
      }
      return { kind: DocKind.Primitive, type: 'number' }
    case 'string':
      if (schema.format === 'binary') {
        return { kind: DocKind.NonLiteralObject, type: schema.title ?? 'File' }
      }
      if (schema.enum != null) {
        return { kind: DocKind.StringLiteral, value: schema.enum[0] }
      }
      return { kind: DocKind.Primitive, type: 'string' }
    case 'null':
      return { kind: DocKind.Primitive, type: 'null' }

    case 'object':
      if (schema.additionalProperties) {
        if (schema.additionalProperties === true) {
          return { kind: DocKind.Record, key: { kind: DocKind.Primitive, type: 'string' }, value: { kind: DocKind.Primitive, type: 'unknow' } }
        }
        parsingList.push(schema)
        const result = { kind: DocKind.Record, key: { kind: DocKind.Primitive, type: 'string' }, value: schema2docNode(schema.additionalProperties, allSchems, parsingList) }
        parsingList.pop()
        return result
      }
      if (schema.properties) {
        return {
          kind: DocKind.LiteralObject,
          props: Object.entries(schema.properties).map(([name, _nestSchema]) => {
            return {
              name,
              ...schema2docNode(_nestSchema, allSchems, parsingList)
            }
          }),
          comment: schema.description
        }
      }
      return { kind: DocKind.NonLiteralObject, type: schema.title ?? '_Unkown_Object' }

    default: {
      const { oneOf, allOf, anyOf } = schema

      parsingList.push(schema)
      let result: DocNode
      if (oneOf != null) {
        result = { kind: DocKind.Union, types: oneOf.map(v => schema2docNode(v, allSchems, parsingList)), } // Union
      } else if (allOf != null) {
        result = { kind: DocKind.Tuple, elements: allOf.map(v => schema2docNode(v, allSchems, parsingList),), } // Union
      } else if (anyOf != null) {
        result = { kind: DocKind.Union, types: anyOf.map(v => schema2docNode(v, allSchems, parsingList)), } // Union
      } else {
        result = { kind: DocKind.Never }
      }
      parsingList.pop()
      return result
    }
  }

}