import { pick } from 'fp-lite'
import { expect, test } from 'vitest'
import { extraModelNames, parseSchame } from '../../src/utils/parsePrisma-new'

const filePath = 'packages/tealina/test/utils/mock/mock.prisma'

test('extra outline', async () => {
  const reuslt = await extraModelNames(filePath)
  expect(reuslt.size).eq(1)
  expect(reuslt.get('model')).deep.eq(['User', 'Post'])
})

test.only('parse to ast', async () => {
  const astList = await parseSchame(filePath)
  expect(astList.length).gte(1)
  const outline = [
    { keyword: 'datasource', name: 'db' },
    { keyword: 'generator', name: 'client' },
    { keyword: 'model', name: 'User' },
    { keyword: 'model', name: 'Post' },
    { keyword: 'enum', name: 'Role' },
    { keyword: 'model', name: 'BlockIgnore' },
  ]
  expect(astList.map(pick('keyword', 'name'))).to.deep.eq(outline)
  const userBlock = astList.find(v => v.name == 'User')!
  expect(userBlock.comment.private[0]).eq(' private comment')
  expect(userBlock.comment.public[0]).eq(' public comment')
  const userIdProp = userBlock.props.find(v => v.name == 'id')!
  expect(userIdProp.attribute.has('id')).true
  expect(userIdProp.attribute.get('default')).eq('(autoincrement())')
  const userEmailProp = userBlock.props.find(v => v.name == 'email')!
  expect(userEmailProp.comment.public[0]).eq(' inline public comment')
})
