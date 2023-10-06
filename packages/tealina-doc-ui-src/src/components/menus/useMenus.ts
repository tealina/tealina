import {
  ItemType,
  MenuItemType,
  SubMenuType,
} from 'antd/es/menu/hooks/useItems'
import { flat, flow, map, pipe, separeBy } from 'fp-lite'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { ApiDoc, DocItem } from 'tealina-doc-types'
import { CurApi, apiDocAtom, curShowApiAtom } from '../../atoms/jsonSourceAtom'

const toItemModel = ([method, docItem]: [
  string,
  Record<string, DocItem>,
]): MenuTreeModel[] =>
  Object.keys(docItem).map(endpoint => {
    const [module, ...rest] = endpoint.split('/')
    return {
      endpoint: rest.join('/'),
      method,
      module,
    }
  })

interface MenuTreeModel {
  endpoint: string
  method: string
  module: string
}

/**
 * craete menu item by api route\
 * follow some rules below:
 * +  /get/user/create
 * +  /post/user/update
 * - user
 *    - create
 *    - update
 *
 * if only two slash, put method on tail and upercase
 * + /get/health
 * - health
 *    - GET
 */
const toMenuItem = (vmList: MenuTreeModel[]): SubMenuType => {
  const [first] = vmList
  const children = vmList.map(vm => {
    const hasEndponit = vm.endpoint.length
    return {
      key: [vm.method, vm.module, ...(hasEndponit ? [vm.endpoint] : [])].join(
        '/',
      ),
      label: hasEndponit ? vm.endpoint : vm.method.toUpperCase(),
    }
  })
  return {
    key: [first.method, first.module, ''].join('/'),
    label: first.module,
    children,
  }
}

const genMenuItems = flow(
  (res: ApiDoc) => Object.entries(res.apis),
  map(toItemModel),
  flat,
  separeBy(x => x.module),
  map(toMenuItem),
)

const gatherFirstElement = (x: ItemType, records: string[] = []): string[] => {
  if (x == null) return records
  records.push(x.key as string)
  if ('children' in x) {
    return gatherFirstElement(x.children![0], records)
  }
  return records
}

const reversetInit = (
  { method, path }: CurApi,
  items: SubMenuType<MenuItemType>[],
) => {
  const route = path.replace(/^[/]|[/]$/g, '')
  const fullKey = pipe(
    route.includes('/') ? [method, path] : [path, method.toLowerCase()],
    xs => xs.join('/'),
  )
  const target = items.find(v => v.children.some(v => v!.key === fullKey))
  if (target == null) return []
  return [target.key, fullKey]
}

export const useMenus = () => {
  const [res] = useAtom(apiDocAtom)
  const [curShowApi, setCurShowApi] = useAtom(curShowApiAtom)
  const items = genMenuItems(res)
  const updateCurShowApi = (e: { key: string }) => {
    const { key } = e
    const [method, ...rest] = key.split('/')
    const nextPath = rest.join('/')
    setCurShowApi({ method, path: nextPath })
    return
  }
  const [defaultOpenKeys] = useState<string[]>(() => {
    if (curShowApi == null) return []
    return reversetInit(curShowApi, items)
  })
  useEffect(() => {
    if (curShowApi == null) {
      const keys = gatherFirstElement(items[0])
      updateCurShowApi({ key: keys.at(-1)! })
    }
  }, [])
  return { items, defaultOpenKeys, updateCurShowApi }
}
