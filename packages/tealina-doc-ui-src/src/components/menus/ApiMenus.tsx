import { Menu } from 'antd'
import { Await } from '../Await'
import { useMenus } from './useMenus'

function MenuInfo() {
  const { menuProps, updateCurShowApi } = useMenus()

  return (
    <Menu
      {...menuProps}
      mode="inline"
      className="h-screen overflow-y-auto"
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
