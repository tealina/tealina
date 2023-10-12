import { describe, expect, test } from 'vitest'
import { parseModelAndType } from '../../src/commands/gpure.js'

describe('test gpure commnad calcation part', () => {
  test('parse shema content', () => {
    const { models, types, enums } = parseModelAndType([
      '/// user model comment above',
      'model User {',
      '///comment above props',
      'id String @id ///comment after attributes',
      'name String',
      'age Int',
      'role Role',
      '}',
      '',
      'model Post {',
      'id String @id',
      'viewCount Int',
      'published Boolean',
      '}',
      '',
      'enum Role {',
      'Admin @map(name:"admin")',
      'User @map("user")',
      '}',
      '',
    ])
    expect(models.length).eq(2)
    expect(types.length).eq(0)
    const [userModel, postModel] = models
    expect(userModel.comments).not.empty
    expect(userModel.props[0].comments).length.gte(0)
    expect(userModel.props[3].name).eq('role')
    expect(userModel.props[3].type.contextual.isEnum).true
    expect(postModel.props.map(v => v.name)).deep.eq([
      'id',
      'viewCount',
      'published',
    ])
  })

  test('optioanl and default', () => {
    const { models } = parseModelAndType([
      'model User {',
      'id String @id  ///comment after attributes',
      'name String',
      'age Int',
      'createdAt Datetime @default(now()) ',
      '}',
      '',
    ])
    const [userModel] = models
    expect(userModel.name).eq('User')
    const { props } = userModel
    const createdAtProp = props.find(v => v.name == 'createdAt')!
    expect(createdAtProp).not.null
    const { attributes } = createdAtProp
    expect(attributes.default).eq('now()')
  })

  test('ignore model and props', () => {
    const { models } = parseModelAndType([
      'model User {',
      'id String @id  ///comment after attributes',
      'name String',
      'age Int',
      'sex String @ignore',
      'createdAt Datetime @default(now()) ',
      '}',
      '',
      'model Profile {',
      'bio Datetime',
      'perf String',
      '@@ignore',
      '}',
    ])
    const [userModel, profileModel] = models
    expect(profileModel).undefined
    expect(userModel.props.find(v => v.name == 'sex')).undefined
  })

  test('without double slash comments', () => {
    const { models } = parseModelAndType([
      '//should ignore me',
      'model User {',
      '// shoule ignore me',
      'id String @id',
      '}',
      '',
    ])
    const [userModel] = models
    expect(userModel.comments).empty
    expect(userModel.props[0].comments).empty
  })
})
