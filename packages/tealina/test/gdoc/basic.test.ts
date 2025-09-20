import path from 'node:path'
import {
  DocKind,
  EnumMemberRefType,
  EnumRefType,
  PrimitiveType,
  RefType,
  TupleType,
  UnionType,
} from '@tealina/doc-types'
import { describe, expect, test } from 'vitest'
import { parseDeclarationFile } from '../../src/utils/parseDeclarationFile.js'

describe('test genereta api documentation api/post/createUser', () => {
  const mockDir = 'test/gdoc/mock'
  const configpath = path.join(mockDir, 'tsconfig.json')
  const result = parseDeclarationFile({
    entries: [path.join(mockDir, 'basic', 'api-v1.d.ts')],
    tsconfigPath: configpath,
  })
  const {
    apis: { post, get },
    entityRefs,
    tupleRefs: {},
    enumRefs,
  } = result
  const [[url, doc]] = Object.entries(post)

  test('examples exists', () => {
    expect(get.user).not.null
    const userDoc = get.user
    expect(userDoc.examples).not.null
    expect(userDoc.examples).toHaveProperty('query')
  })
  test('all apperence entities', () => {
    expect(post).not.null
    expect(url).eq('user/create')
    expect(doc.comment).eq('create an user')
    const { body, response, headers } = doc
    const entities = [body, response, headers]
    expect(entities.every(v => v != null)).true
    expect(entities.map(v => v?.kind).every(v => v == DocKind.EntityRef)).true
  })
  test('body detail', () => {
    const bodyType = entityRefs[(doc.body as RefType).id]
    expect(bodyType).not.null
    expect(bodyType.name).eq('UserCreateInput')
    expect(bodyType.props.length).eq(3)
    const [emailProp, nameProp, roleProp] = bodyType.props
    expect(emailProp).contains({
      name: 'email',
      kind: DocKind.Primitive,
    })
    expect(nameProp).contains({
      name: 'name',
      kind: DocKind.Primitive,
      isOptional: true,
    })
    expect(roleProp).contains({
      name: 'role',
      kind: DocKind.Union,
    })
    expect((roleProp as UnionType).types).deep.eq([
      { kind: DocKind.StringLiteral, value: 'Admin' },
      { kind: DocKind.StringLiteral, value: 'User' },
    ])
  })

  test('response detail', () => {
    const responseType = entityRefs[(doc.response as RefType).id]
    expect(responseType).not.null
    expect(responseType).contains({
      name: 'User',
      comment: 'Model User',
    })
    expect(responseType.props.length).gte(3)
    const [idProp, emailProp, nameProp, roleProp] = responseType.props
    expect(idProp).contains({
      name: 'id',
      kind: DocKind.Primitive,
      type: 'number',
    })
    expect(emailProp).contains({
      name: 'email',
      kind: DocKind.Primitive,
      type: 'string',
    })
    expect(nameProp).contains({
      name: 'name',
      kind: DocKind.Union,
    })
    expect((nameProp as UnionType).types).deep.eq([
      { kind: DocKind.Primitive, type: 'string' },
      { kind: DocKind.Primitive, type: 'null' },
    ])
    expect(roleProp).contains({
      name: 'role',
      kind: DocKind.Union,
    })
    expect((roleProp as UnionType).types).deep.eq([
      { kind: DocKind.StringLiteral, value: 'Admin' },
      { kind: DocKind.StringLiteral, value: 'User' },
    ])
  })

  test('regular enum prop', () => {
    const responseType = entityRefs[(doc.response as RefType).id]
    expect(responseType.props).length.gte(4)
    const [, , , , stateProp, badgeProp] = responseType.props
    expect(stateProp).contains({ kind: DocKind.EnumRef, name: 'state' })
    const { name, members } = enumRefs[(stateProp as EnumRefType).id]
    const [active, disabled] = members
    expect(active).deep.contains({
      key: 'Active',
      value: { kind: DocKind.NumberLiteral, value: 0 },
    })
    expect(disabled).deep.contains({
      key: 'Disabled',
      value: { kind: DocKind.NumberLiteral, value: 3 },
    })
    expect(active).deep.contains({
      key: 'Active',
      value: { kind: DocKind.NumberLiteral, value: 0 },
    })
    expect(disabled).deep.contains({
      key: 'Disabled',
      value: { kind: DocKind.NumberLiteral, value: 3 },
    })
  })

  test('initialized enum prop', () => {
    const responseType = entityRefs[(doc.response as RefType).id]
    expect(responseType.props).length.gte(4)
    const [, , , , , badgeProp] = responseType.props
    expect(badgeProp).contains({ kind: DocKind.EnumRef, name: 'badge' })
    const { name, members } = enumRefs[(badgeProp as EnumRefType).id]
    const [blue, gold] = members
    expect(blue).deep.contains({
      key: 'Blue',
      value: { kind: DocKind.NumberLiteral, value: 0 },
    })
    expect(gold).deep.contains({
      key: 'Gold',
      value: { kind: DocKind.StringLiteral, value: 'Glod' },
    })
  })

  test('headers detail', () => {
    const headersType = entityRefs[(doc.headers as RefType).id]
    expect(headersType).not.null
    expect(headersType.name).eq('AuthHeaders')
    expect(headersType.props.length).eq(1)
    const [prop] = headersType.props
    expect(prop).contains({
      name: 'Authorization',
      kind: DocKind.Primitive,
    })
  })

  test('edge case', () => {
    const variety = post['variety']
    const { body, response } = variety!
    // console.log(entityRefs['540']['props'].at(-1))
    expect(body!.kind).eq(DocKind.EntityRef)
    const bodyEntity = entityRefs[(body as RefType).id]
    const [
      limitRecord,
      unionKeysRecord,
      recordProp,
      tupleProp,
      intersactionProp,
      unioiProp,
      enumProp,
    ] = bodyEntity.props
    expect(enumProp).contains({
      kind: DocKind.EnumRef,
      name: 'newEnum',
    })
    const computedEnum = enumRefs[(enumProp as EnumRefType).id]
    const memberSnapthost = [
      {
        key: 'None',
        value: { kind: 8, value: 0 },
      },
      {
        key: 'Read',
        value: { kind: 8, value: 2 },
      },
      {
        key: 'Write',
        value: { kind: 8, value: 4 },
      },
      {
        key: 'ReadWrite',
        value: { kind: 8, value: 6 },
      },
      {
        key: 'G',
        value: { kind: 0, type: 'number' },
      },
    ]
    computedEnum.members.forEach((member, i) => {
      expect(member).deep.contains(memberSnapthost[i])
    })
    expect(limitRecord).deep.contains({
      kind: DocKind.Record,
      name: 'limitRecord',
      key: { kind: DocKind.Primitive, type: 'string' },
      value: { kind: DocKind.Primitive, type: 'number' },
    })
    expect(recordProp).deep.contains({
      kind: DocKind.Record,
      name: 'record',
      comment: 'yoyo',
      key: { kind: DocKind.Primitive, type: 'string' },
      value: { kind: DocKind.Primitive, type: 'any' },
    })
    expect(tupleProp).deep.contains({
      kind: DocKind.Tuple,
      name: 'tuple',
    })
    const [primitiveStr, enumMemberRef] = (tupleProp as TupleType).elements as [
      PrimitiveType,
      EnumMemberRefType,
    ]
    expect(primitiveStr).contains({ kind: DocKind.Primitive, type: 'string' })
    const targetEnum = enumRefs[enumMemberRef.enumId]
    const targetMember = targetEnum.members.find(
      v => v.memberId == enumMemberRef.memberId,
    )
    expect(targetMember).not.null
  })
})
