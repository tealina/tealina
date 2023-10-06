import { Spin } from 'antd'
import { ReactNode, Suspense } from 'react'

export function Await({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Spin />}>{children}</Suspense>
}
