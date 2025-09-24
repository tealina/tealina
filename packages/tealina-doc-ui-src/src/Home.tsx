import { Layout } from 'antd'
import { ApiDetail } from './components/api_detail/ApiDetail'
import { Await } from './components/Await'
import { HeaderAction } from './components/HeaderAction'
import { ApiMenus } from './components/menus/ApiMenus'
import { DocSearchProvider } from './components/Search'

const { Sider, Content } = Layout

export function HomePage() {
  return (
    <Layout className="max-h-screen dark:bg-[rgb(24,24,24)]">
      <Sider className="h-screen" width="min(20em, 30%)">
        <ApiMenus />
      </Sider>
      <Layout className="max-h-screen overflow-y-auto text-lg">
        <Await>
          <DocSearchProvider>
            <HeaderAction />
          </DocSearchProvider>
        </Await>
        <Content className="h-screen">
          <Await>
            <ApiDetail />
          </Await>
        </Content>
      </Layout>
    </Layout>
  )
}

