import { test, expect } from 'vitest'
import { assembleHTML, getAssetsPath } from '../src/index.js'
test('should has access files', () => {
  const files = getAssetsPath()
  expect(files.length).gte(3)
})
test('assemble html', async () => {
  const config = {
    title: 'Custom Tile',
    sources: [{ baseURL: 'test/api', jsonURL: 'test-api/v1.json' }],
  }
  const html = await assembleHTML(config)
  const { title, ...rest } = config
  expect(html).include(title)
  expect(html).includes(`window.TEALINA_VDOC_CONFIG=${JSON.stringify(rest)}`)
})
