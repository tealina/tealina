import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { syntaxColorAtom } from '../atoms/themeAtom'

export function ColorText({
  children,
  type = 'any',
  className,
}: {
  children: ReactNode
  type?: string
  className?: string
}) {
  const TypeColors = useAtomValue(syntaxColorAtom)
  return (
    <span
      style={{
        color: TypeColors[type as keyof typeof TypeColors] ?? TypeColors.any,
      }}
      className={className}
    >
      {children}
    </span>
  )
}
