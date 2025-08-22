import type { ApiDoc, DocItem } from '@tealina/doc-types'
import { MenuProps, Tag } from 'antd'
import type {
  ItemType,
  MenuItemType,
  SubMenuType,
} from 'antd/es/menu/hooks/useItems'
import { flat, flow, isEmpty, map, pickFn, pipe, separeBy } from 'fp-lite'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import {
  type CurApi,
  apiDocAtom,
  curShowApiAtom
} from '../../atoms/jsonSourceAtom'
import { getMethodColor } from '../../utils/methodColors'
import { apiSummariesAtom, ApiSummary } from '../../atoms/summaryAtom'



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
const toMenuItem = (vmList: ApiSummary[]): SubMenuType => {
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
  separeBy((x: ApiSummary) => x.module),
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


export const useMenus = () => {
  const summaries = useAtomValue(apiSummariesAtom)
  const [curShowApi, setCurShowApi] = useAtom(curShowApiAtom)
  const menuProps = useMemo(() => {
    const items = genMenuItems(summaries)
    const [headOne] = items
    const defaultOpenKeys = [headOne.key]
    const defaultSelectedKeys = isEmpty(headOne.children) ? defaultOpenKeys : [headOne.children[0]!.key as string, ...defaultOpenKeys]
    return { items, defaultOpenKeys, defaultSelectedKeys }
  }, [summaries])
  const updateCurShowApi = (e: { key: string }) => {
    const { key } = e
    const [method, ...rest] = key.split('/')
    const nextPath = rest.join('/')
    setCurShowApi({ method, path: nextPath })
    return
  }
  useEffect(() => {
    if (curShowApi == null) {
      const keys = gatherFirstElement(menuProps.items[0])
      updateCurShowApi({ key: keys.at(-1)! })
      return
    }
  }, [curShowApi])
  return { menuProps, updateCurShowApi }
}
