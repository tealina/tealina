import path from 'path'
import { ArrayType, DocKind, RefType, TupleType } from '@tealina/doc-types'
import { describe, expect, test } from 'vitest'
import { parseDeclarationFile } from '../../src/utils/parseDeclarationFile.js'

describe('test genereta api documentation api/post/createUser', () => {
  const mockDir = 'packages/tealina/test/gdoc/mock'
  const result = parseDeclarationFile({
    entries: [path.join(mockDir, 'complex', 'api-v1.d.ts')],
    tsconfigPath: path.join(mockDir, 'tsconfig.json'),
  })
  const {
    apis: { post },
    entityRefs,
    tupleRefs,
    // enumRefs,
  } = result
  test('is correct', () => {
    expect(post != null).true
  })

  test('constraint', () => {
    expect(post).toHaveProperty('constraint')
    expect(post.constraint).toHaveProperty('body')
    const body = post.constraint.body!
    expect(body.kind).eq(DocKind.EntityRef)
    const entity = entityRefs[(body as RefType).id]
    const findManyArgsEntity = entity.props.find(
      v => v.name == 'where' && v.isOptional,
    )
    expect(findManyArgsEntity != null).true
    expect(findManyArgsEntity!.kind).eq(DocKind.EntityRef)
    const refId = (findManyArgsEntity as RefType).id
    expect(entityRefs).have.property(refId + '')
    const where = entityRefs[refId]
    expect(where.props).not.empty
    expect(where.props.every(v => v.kind != DocKind.Never))
  })

  test('recursion entity', () => {
    expect(post).toHaveProperty('recursionEntity')
    expect(post.recursionEntity).toHaveProperty('response')
    const response = post.recursionEntity.response!
    expect(response.kind).eq(DocKind.Array)
    const { element } = response as ArrayType
    expect(element.kind).eq(DocKind.EntityRef)
    const { id } = element as RefType
    const entity = entityRefs[id]
    expect(entity.props).to.deep.include({
      kind: DocKind.Array,
      element: {
        kind: DocKind.RecursionEntity,
        id: id,
      },
      name: 'children',
      comment: void 0,
      jsDoc: void 0,
    })
  })

  test('recursion tuples', () => {
    expect(post).toHaveProperty('recursionTuple')
    expect(post.recursionTuple).toHaveProperty('response')
    const response = post.recursionTuple.response!
    expect(response.kind).eq(DocKind.Array)
    const firstKey = Object.keys(tupleRefs)[1]
    const { elements } =
      tupleRefs[firstKey as unknown as keyof typeof tupleRefs]
    const { element } = response as ArrayType
    expect(elements).deep.equal((element as TupleType).elements)
  })
})
