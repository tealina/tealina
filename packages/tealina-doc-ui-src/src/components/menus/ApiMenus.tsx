import { Menu } from 'antd'
import { Await } from '../Await'
import { useMenus } from './useMenus'

function MenuInfo() {
  const { items, defaultOpenKeys, updateCurShowApi } = useMenus()
  return (
    <Menu
      items={items}
      mode="inline"
      className="h-screen overflow-y-auto"
      defaultOpenKeys={defaultOpenKeys}
      defaultSelectedKeys={defaultOpenKeys}
      multiple={false}
      onClick={updateCurShowApi}
    />
  )
}

export function ApiMenus() {
  return (
    <Await>
      <MenuInfo />
    </Await>
  )
}
