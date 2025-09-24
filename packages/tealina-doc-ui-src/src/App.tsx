import { App, ConfigProvider, theme } from 'antd'
import { useAtomValue } from 'jotai'
import { ErrorBoundary } from 'react-error-boundary'
import { authAtom } from './atoms/authAtom'
import { themeAtom } from './atoms/themeAtom'
import { HomePage } from './Home'
import { LandingPage } from './Landing'


function MyApp() {
  const themeMode = useAtomValue(themeAtom)
  const authCtx = useAtomValue(authAtom)
  return (
    <ErrorBoundary
      fallbackRender={err => (
        <div className="text-center py-5 text-red-5 font-bold">
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
          {authCtx.isNeedPwd && !authCtx.isValidated ? <LandingPage /> : <HomePage />}
        </App>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default MyApp
