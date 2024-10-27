import { Spin } from 'antd'
import { type ReactNode, Suspense } from 'react'

export function Await({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Spin />}>{children}</Suspense>
}
