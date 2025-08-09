import type { ApiDoc, DocItem } from '@tealina/doc-types'
import { Tag } from 'antd'
import type {
  ItemType,
  MenuItemType,
  SubMenuType,
} from 'antd/es/menu/hooks/useItems'
import { flat, flow, map, pipe, separeBy } from 'fp-lite'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import {
  type CurApi,
  apiDocAtom,
  curShowApiAtom
} from '../../atoms/jsonSourceAtom'
import { getMethodColor } from '../../utils/methodColors'

const toItemModel = ([method, docItem]: [
  string,
  Record<string, DocItem>,
]): MenuTreeModel[] =>
  Object.keys(docItem).map(endpoint => {
    const parts = endpoint.split('/')
    const isRoot = parts.length <= 2
    const isTail = parts[0] === ''
    const index = isTail ? 1 : 0
    const module = isRoot ? '/' : isTail ? parts[1] : parts[0]
    const rest = module === parts[index] ? ['', ...parts.slice(index + 1)] : parts
    return {
      endpoint,
      label: rest.join('/'),
      method,
      module
    }
  })

interface MenuTreeModel {
  endpoint: string
  label: string
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
    // const hasEndponit = vm.endpoint.length
    // const url = hasEndponit ? vm.endpoint : vm.method.toUpperCase()
    // const url = vm.endpoint
    return {
      // key: [vm.method, vm.module, ...(hasEndponit ? [vm.endpoint] : [])].join('/'),
      key: [vm.method, vm.endpoint].join('/'),
      label: <span>
        <Tag color={getMethodColor(vm.method)}>{vm.method}</Tag>
        {vm.label}
      </span>,
    }
  })
  return {
    key: first.module,
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
    const { children } = x
    if (children != null && children.length > 0) {
      return gatherFirstElement(children[0], records)
    }
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
  const target = items.find(v => v.children.some(v => v?.key === fullKey))
  if (target == null) return []
  return [target.key, fullKey]
}

export const useMenus = () => {
  const [res] = useAtom(apiDocAtom)
  const [curShowApi, setCurShowApi] = useAtom(curShowApiAtom)
  // const curJsonItem = useAtomValue(curJsonSourceAtom)
  const items = genMenuItems(res)
  // if (items.length > 0) {
  //   items[0].label = curJsonItem.baseURL
  // }
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
  }, [curShowApi])
  return { items, defaultOpenKeys, updateCurShowApi }
}
