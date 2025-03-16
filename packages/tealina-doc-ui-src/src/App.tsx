import { App, ConfigProvider, Layout, theme } from 'antd'
import { useAtomValue } from 'jotai'
import { themeAtom } from './atoms/themeAtom'
import { ApiMenus } from './components/menus/ApiMenus'
import { ApiDetail } from './components/api_detail/ApiDetail'
import { HeaderAction } from './components/HeaderAction'
import { ErrorBoundary } from 'react-error-boundary'

const { Sider, Content } = Layout

function MyApp() {
  const themeMode = useAtomValue(themeAtom)
  return (
    <ErrorBoundary
      fallbackRender={err => (
        <div className="text-center py-5 text-red-5 font-bold text-lg">
          {String(err.error)}
        </div>
      )}
    >
      <ConfigProvider
        theme={{
          algorithm:
            themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <App>
          <Layout className="max-h-screen dark:bg-[rgb(24,24,24)]">
            <Sider className="h-screen overflow-y-auto" width="min(20em, 30%)">
              <ApiMenus />
            </Sider>
            <Layout className="max-h-screen overflow-y-auto text-lg">
              <HeaderAction />
              <Content className="h-screen">
                <ApiDetail />
              </Content>
            </Layout>
          </Layout>
        </App>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default MyApp
