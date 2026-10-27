import { AdminView } from './components/AdminView'
import { AuthModal } from './components/AuthModal'
import { CartDrawer } from './components/CartDrawer'
import { Footer, Toasts } from './components/ui'
import { Header } from './components/Header'
import { OrdersView } from './components/OrdersView'
import { ProductDrawer } from './components/ProductDrawer'
import { ShopView } from './components/ShopView'
import { useShop } from './store'

export const App = () => {
  const { state } = useShop()

  return (
    <>
      <Header />
      <main>
        {state.view === 'orders' ? (
          <OrdersView />
        ) : state.view === 'admin' ? (
          <AdminView />
        ) : (
          <ShopView />
        )}
      </main>
      <Footer />
      <ProductDrawer />
      <CartDrawer />
      {state.ui.authOpen ? <AuthModal /> : null}
      <Toasts />
    </>
  )
}
