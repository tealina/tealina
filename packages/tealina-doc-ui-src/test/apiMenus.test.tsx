import { fireEvent, render } from '@testing-library/react'
import { useAtomValue } from 'jotai'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { DocKind } from '@tealina/doc-types'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { curShowApiAtom } from '../src/atoms/jsonSourceAtom'
import { ApiMenus } from '../src/components/menus/ApiMenus'
import { JSON_URL } from './mockConfig'

const defaultApiDoc = {
  apis: {
    get: {
      health: {
        response: {
          kind: DocKind.EntityRef,
          id: 1,
        },
      },
    },
  },
  enumRefs: {},
  refs: {
    1: {
      name: '',
      props: [{ kind: DocKind.Primitive, name: 'status', type: 'string' }],
    },
  },
}

const server = setupServer(
  http.get(JSON_URL, (_ctx) => {
    return HttpResponse.json(defaultApiDoc)
  }),
)

describe('test use menus hook', () => {
  beforeAll(() => {
    server.listen()
  })
  // afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  test('show menu and click to effect atom', async () => {
    let curApi: any = null
    const ContentSection = () => {
      const cur = useAtomValue(curShowApiAtom)
      curApi = cur
      return <div>{cur?.method}, {cur?.path}</div>
    }
    const result = render(
      <div>
        <ApiMenus />
        <div>
          <ContentSection />
        </div>
      </div>,
    )
    const list = await result.findAllByText('health')
    const el = list.find(v => v.classList.contains('ant-menu-title-content'))
    expect(el != null).true
    fireEvent.click(el!)
    fireEvent.click(result.getByText('health'))
    expect(curApi).toMatchObject({ method: 'get', path: 'health' })
  })
})
