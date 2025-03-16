import type {
  PropType,
  ApiDoc,
  DocItem,
  DocNode,
  Entity,
  EnumEntity,
  TupleEntity,
} from '@tealina/doc-types'
import { DocKind } from '@tealina/doc-types'
import { pickFn } from 'fp-lite'
import type { OpenAPIV3_1 } from 'openapi-types'
export type BasicOpenApiJson = Pick<
  OpenAPIV3_1.Document,
  'openapi' | 'paths' | 'components'
>

// ref: https://spec.openapis.org/oas/latest.html

const kContentTypePattern = /content-type/i

const kTextPlan = {
  'text/plain': {
    schema: {},
  },
}

const kApplicationJson = 'application/json'

export function convertToOpenApiJson(
  apiDoc: ApiDoc,
  prefix = '/api/v1',
): BasicOpenApiJson {
  //  All functions within the function indirectly or directly require the use of the first parameter apiDoc,
  //  so they are defined within the function
  //
  function convertEntityToSchema(entity: Entity): OpenAPIV3_1.SchemaObject {
    const schema: OpenAPIV3_1.SchemaObject = {
      type: 'object',
      properties: {},
      required: [],
    }
    for (const prop of entity.props) {
      schema.properties![prop.name] = convertDocNodeToSchema(prop)
      if (!prop.isOptional) {
        schema.required!.push(prop.name)
      }
    }
    return schema
  }

  function convertEnumToSchema(
    enumEntity: EnumEntity,
  ): OpenAPIV3_1.SchemaObject {
    const enumValues = enumEntity.members
      .map(member => {
        if (member.value.kind === DocKind.Primitive) {
          // PrimitiveType
          return member.value.type
        }
        if (member.value.kind === DocKind.StringLiteral) {
          // StringLiteral
          return member.value.value
        }
        if (member.value.kind === DocKind.NumberLiteral) {
          // NumberLiteral
          return member.value.value
        }
        return null
      })
      .filter(value => value !== null)

    return {
      type: 'string',
      enum: enumValues,
    }
  }

  function convertTupleToSchema(
    tupleEntity: TupleEntity,
  ): OpenAPIV3_1.ArraySchemaObject {
    return {
      type: 'array',
      items: {
        oneOf: tupleEntity.elements.map(element =>
          convertDocNodeToSchema(element),
        ),
      },
    }
  }

  function getResponseContent({ response }: DocItem) {
    if (response == null) return kTextPlan
    if (isUnknown(response)) return kTextPlan
    return {
      'application/json': {
        schema: convertDocNodeToSchema(response),
      },
    }
  }

  function convertDocItemToPathItem(docItem: DocItem): any {
    const headEntity = getHeadEntity(docItem, apiDoc.entityRefs)
    const pathItem: OpenAPIV3_1.OperationObject = {
      responses: {
        '200': {
          description: 'OK',
          content: getResponseContent(docItem),
        },
      },
    }
    if (docItem.body) {
      const getRequestContentType = (props: PropType[]) => {
        const prop = props.find(v => kContentTypePattern.test(v.name))
        if (prop == null) return kApplicationJson
        if (prop.kind !== DocKind.StringLiteral) return kApplicationJson
        return prop.value
      }
      pathItem.requestBody = {
        ...getExtraInfo(docItem.body),
        content: {
          [getRequestContentType(headEntity.props)]: {
            schema: convertDocNodeToSchema(docItem.body),
          },
        },
      }
    }

    if (docItem.query) {
      pathItem.parameters = pathItem.parameters ?? []
      pathItem.parameters.push(
        ...convertDocNodeToFlatProps(docItem.query, { in: 'query' }),
      )
    }

    if (docItem.params) {
      pathItem.parameters = pathItem.parameters ?? []
      pathItem.parameters.push(
        ...convertDocNodeToFlatProps(docItem.params, { in: 'path' }),
      )
    }
    if (docItem.headers) {
      pathItem.parameters = pathItem.parameters ?? []
      pathItem.parameters.push(
        ...convertDocNodeToFlatProps(docItem.headers, { in: 'header' }),
      )
    }

    return pathItem
  }

  function convertDocNodeToSchema(
    docNode: DocNode,
  ): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject {
    switch (docNode.kind) {
      case DocKind.Primitive: // PrimitiveType
        return {
          type: docNode.type.toLowerCase() as OpenAPIV3_1.NonArraySchemaObjectType,
          ...getDescription(docNode),
          ...getIsDeprecated(docNode),
          ...getExtraFrom(docNode.jsDoc),
        }
      case DocKind.NonLiteralObject: {
        const extra = {
          ...getDescription(docNode),
          ...getIsDeprecated(docNode),
          ...getExtraFrom(docNode.jsDoc),
        }
        switch (docNode.type) {
          case 'File':
          case 'Blob':
          case 'Buffer':
            return {
              type: 'string',
              format: 'binary',
              title: docNode.type,
              ...extra,
            }
          default:
            return {
              type: 'object',
              title: docNode.type,
              ...extra,
            }
        }
      }
      case DocKind.Tuple: // TupleType
        return {
          type: 'array',
          items: {
            oneOf: docNode.elements.map(element =>
              convertDocNodeToSchema(element),
            ),
          },
        }
      case DocKind.Union: // UnionType
        return {
          oneOf: docNode.types.map(type => convertDocNodeToSchema(type)),
        }
      case DocKind.EntityRef: // RefType
        return {
          $ref: `#/components/schemas/${apiDoc.entityRefs[docNode.id].name}`,
        }
      case DocKind.Never: // NeverType
        return { type: 'null' }
      case DocKind.Record: // RecordType
        return {
          type: 'object',
          additionalProperties: isUnknown(docNode.value)
            ? true
            : convertDocNodeToSchema(docNode.value),
        }
      case DocKind.StringLiteral: // StringLiteral
        return {
          type: 'string',
          enum: [docNode.value],
        }
      case DocKind.NumberLiteral: // NumberLiteral
        return {
          type: 'number',
          enum: [docNode.value],
        }
      case DocKind.EnumRef: // EnumRef
        return {
          $ref: `#/components/schemas/${apiDoc.enumRefs[docNode.id].name}`,
        }
      case DocKind.EnumMemberRef: // EnumMemberRef
        return {
          $ref: `#/components/schemas/${apiDoc.enumRefs[docNode.enumId].name}`,
        }
      case DocKind.Array: // ArrayType
        return {
          type: 'array',
          items: convertDocNodeToSchema(docNode.element),
        }
      case DocKind.RecursionTuple: // RecursionTuple
        return {
          $ref: `#/components/schemas/${apiDoc.tupleRefs[docNode.id].name}`,
        }
      case DocKind.RecursionEntity: // RecursionEntity
        return {
          $ref: `#/components/schemas/${apiDoc.entityRefs[docNode.id].name}`,
        }
      default:
        throw new Error(`Unsupported DocNode kind: ${JSON.stringify(docNode)}`)
    }
  }

  function convertDocNodeToFlatProps(
    docNode: DocNode,
    extra: Record<string, string>,
  ): any {
    switch (docNode.kind) {
      case DocKind.EntityRef: {
        const entity = apiDoc.entityRefs[docNode.id]
        return entity.props.map(p => ({
          ...extra,
          ...getExtraInfo(p),
          name: p.name,
          schema: convertDocNodeToSchema(p),
        }))
      }
      default:
        console.warn('Non Object Headers omited', JSON.stringify(docNode))
        return []
    }
  }
  function getExtraInfo(docNode: DocNode) {
    return Object.assign(
      {},
      getIsRequired(docNode),
      getDescription(docNode),
      getIsDeprecated(docNode),
    )
  }

  const schemas: Record<string, OpenAPIV3_1.SchemaObject> = {}

  const openApiJson: BasicOpenApiJson = {
    openapi: '3.1.1',
    paths: {},
    components: {
      schemas,
    },
  }

  // Convert entities to Open API schemas
  for (const [_id, entity] of Object.entries(apiDoc.entityRefs)) {
    schemas[entity.name] = convertEntityToSchema(entity)
  }

  // Convert enums to Open API schemas
  for (const [_id, enumEntity] of Object.entries(apiDoc.enumRefs)) {
    schemas[enumEntity.name] = convertEnumToSchema(enumEntity)
  }

  // Convert tuples to Open API schemas
  for (const [_id, tupleEntity] of Object.entries(apiDoc.tupleRefs)) {
    schemas[tupleEntity.name] = convertTupleToSchema(tupleEntity)
  }

  // Convert APIs to Open API paths
  for (const [method, endpoints] of Object.entries(apiDoc.apis)) {
    for (const [rawEndpoint, docItem] of Object.entries(endpoints)) {
      const pathItem = convertDocItemToPathItem(docItem)
      const endpoint = [prefix, transformPath(rawEndpoint)].join('/')
      if (!openApiJson.paths![endpoint]) {
        openApiJson.paths![endpoint] = {}
      }
      openApiJson.paths![endpoint][
        method.toLowerCase() as OpenAPIV3_1.HttpMethods
      ] = pathItem
    }
  }

  return openApiJson
}

function getIsRequired(docNode: DocNode) {
  if (docNode.isOptional !== true) return { required: true }
  return {}
}
function getDescription(docNode: DocNode) {
  return docNode.comment ? { description: docNode.comment } : {}
}

const kParamsPattern = /:([^\/]+)/g

function transformPath(endpoint: string) {
  if (!endpoint.includes(':')) return endpoint
  return endpoint.replace(kParamsPattern, '{$1}')
}

function isUnknown(docNode: DocNode) {
  if (docNode.kind === DocKind.Primitive) {
    return docNode.type === 'unknown'
  }
  return false
}

function getExtraFrom(jsDoc?: DocNode['jsDoc']) {
  const obj: Partial<
    Record<'format' | 'contentMediaType' | 'contentEncoding', string>
  > = {}
  if (jsDoc == null) return obj
  return pickFn(
    jsDoc,
    'format',
    'contentMediaType',
    'contentEncoding',
    'default',
  )
}

function getIsDeprecated({ jsDoc }: DocNode) {
  if (jsDoc == null) return {}
  if ('deprecated' in jsDoc) {
    return { deprecated: true }
  }
}

function getHeadEntity({ headers }: DocItem, entityRefs: ApiDoc['entityRefs']) {
  if (headers == null) return { props: [] }
  if (headers.kind === DocKind.EntityRef) {
    return entityRefs[headers.id]
  }
  return { props: [] }
}
