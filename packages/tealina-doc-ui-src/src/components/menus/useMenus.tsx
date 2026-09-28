import { MenuProps, Tag } from 'antd'
import { flow, map, separeBy } from 'fp-lite'
import { useAtom, useAtomValue } from 'jotai'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { curShowApiAtom } from '../../atoms/jsonSourceAtom'
import { apiSummariesAtom, ApiSummary } from '../../atoms/summaryAtom'
import { getMethodColor } from '../../utils/methodColors'

/**
 * A built menu node: a leaf (`key` + `label`) or a group that also carries `children`.
 *
 * Deliberately narrower than antd's `ItemType`, which allows `null`, makes `key` and
 * `label` optional, and — through `SubMenuType` — demands a `children` array that a
 * leaf does not have. Everything below reads `key` and `children` as required, so the
 * concrete shape is what the file works with; it stays assignable to `ItemType`, which
 * is all `MenuProps` asks for.
 */
type MenuItem = {
  key: string
  label: ReactNode
  children?: MenuItem[]
}

/**
 * craete menu item by api route\
 */
const toMenuItem = (vmList: ApiSummary[]): MenuItem => {
  const [first] = vmList
  if (first.module == '' && vmList.length == 1) {
    return {
      key: [first.method, '', ''].join('/'),
      label: (
        <span>
          <Tag color={getMethodColor(first.method)}>{first.method}</Tag>
          {'/'}
        </span>
      ),
    }
  }
  const children = vmList.map(vm => {
    return {
      key: [vm.method, vm.endpoint].join('/'),
      label: (
        <span>
          <Tag color={getMethodColor(vm.method)}>{vm.method}</Tag>
          {vm.label}
        </span>
      ),
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

const gatherFirstElement = (x: MenuItem, records: string[] = []): string[] => {
  records.push(x.key)
  if (x.children != null && x.children.length > 0) {
    return gatherFirstElement(x.children[0]!, records)
  }
  return records
}

export const useMenus = () => {
  const summaries = useAtomValue(apiSummariesAtom)
  const [curShowApi, setCurShowApi] = useAtom(curShowApiAtom)
  const { items, defaultOpenKeys, defaultSelectedKeys } = useMemo(() => {
    const items = genMenuItems(summaries)
    if (items.length <= 0) {
      return { items, defaultOpenKeys: [], defaultSelectedKeys: [] }
    }
    const [headOne] = items
    const defaultOpenKeys = [headOne.key]
    const { children } = headOne
    const defaultSelectedKeys =
      children == null
        ? [] // a leaf at the root: nothing to preselect under it
        : children.length > 0
          ? [children[0]!.key, ...defaultOpenKeys]
          : defaultOpenKeys
    return { items, defaultOpenKeys, defaultSelectedKeys }
  }, [summaries])
  const [openKeys, setOpenKeys] = useState(defaultOpenKeys)
  const [selectedKeys, setSelectedKeys] = useState(defaultSelectedKeys)
  const updateCurShowApi = (key: string) => {
    const [method, ...rest] = key.split('/')
    const nextPath = rest.join('/')
    setCurShowApi({ method, path: nextPath })
    return
  }
  useEffect(() => {
    if (curShowApi == null) {
      const keys = gatherFirstElement(items[0])
      updateCurShowApi(keys.at(-1)!)
      return
    }
    const { method, path } = curShowApi
    const _keys = [method, path].join('/')
    const [, part] = path.split('/')
    const _open = [_keys, part]
    setSelectedKeys([_keys])
    setOpenKeys(_open)
  }, [curShowApi])
  const menuProps: MenuProps = {
    items,
    selectedKeys,
    openKeys,
    defaultOpenKeys,
    defaultSelectedKeys,
    onSelect: info => {
      setOpenKeys(info.keyPath)
      setSelectedKeys(info.selectedKeys)
      updateCurShowApi(info.key)
    },
    onOpenChange: keys => {
      setOpenKeys(keys)
    },
  }
  return menuProps
}
