import '@unocss/reset/tailwind.css'
import 'uno.css'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ShopProvider } from './store'

const root = document.querySelector<HTMLElement>('#app')
if (root == null) throw new Error('#app is missing from index.html')

createRoot(root).render(
  <ShopProvider>
    <App />
  </ShopProvider>,
)
