import { Menu } from 'antd'
import { Await } from '../Await'
import { useMenus } from './useMenus'

function MenuInfo() {
  const { items, seletedKeys, setSelectedKeys, updateCurShowApi } = useMenus()
  return (
    <Menu
      items={items}
      mode="inline"
      className="h-screen overflow-y-auto"
      // defaultOpenKeys={defaultOpenKeys}
      // defaultSelectedKeys={defaultOpenKeys}
      openKeys={seletedKeys}
      selectedKeys={seletedKeys}
      onOpenChange={setSelectedKeys}
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
