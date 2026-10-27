import type { CSSProperties, ReactNode } from 'react'
import { initials, money, shortDate, stars, statusLabel } from '../format'
import { useShop } from '../store'
import type { OrderStatus, ProductView, ToastKind } from '../types'

const kFallbackAccent = '#b4552d'

/** Product accents come from the API; keep a malformed one out of the style attribute. */
export const safeAccent = (value: string) =>
  /^#[0-9a-f]{3,8}$/i.test(value) ? value : kFallbackAccent

const accentVar = (value: string) =>
  ({ '--accent': safeAccent(value) }) as CSSProperties

export const artStyle = (value: string): CSSProperties => ({
  ...accentVar(value),
  background:
    'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--accent) 55%, #fff) 0%, var(--accent) 58%, color-mix(in srgb, var(--accent) 62%, #000) 100%)',
})

export const miniArtStyle = (value: string): CSSProperties => ({
  ...accentVar(value),
  background:
    'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--accent) 48%, #fff), var(--accent))',
})

export const drawerArtStyle = (value: string): CSSProperties => ({
  ...accentVar(value),
  background:
    'radial-gradient(circle at 32% 26%, color-mix(in srgb, var(--accent) 45%, #fff) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 60%, #000) 100%)',
})

export const MiniArt = ({
  accent,
  small = false,
  children,
}: {
  accent: string
  small?: boolean
  children: ReactNode
}) => (
  <span
    className={small ? 'mini-art-small' : 'mini-art'}
    style={miniArtStyle(accent)}
    aria-hidden="true"
  >
    {children}
  </span>
)

export const Avatar = ({
  name,
  small = false,
}: {
  name: string
  small?: boolean
}) => (
  <span className={small ? 'avatar-small' : 'avatar'} aria-hidden="true">
    {initials(name)}
  </span>
)

export const Rating = ({
  product,
}: {
  product: Pick<ProductView, 'rating' | 'reviewCount'>
}) =>
  product.reviewCount === 0 ? (
    <span className="text-[0.78rem] tracking-[0.04em] text-muted whitespace-nowrap">
      New
    </span>
  ) : (
    <span
      className="text-[0.78rem] tracking-[0.08em] text-amber whitespace-nowrap"
      title={`${product.rating} out of 5`}
    >
      {stars(product.rating)}{' '}
      <small className="text-muted tracking-normal">
        {product.reviewCount}
      </small>
    </span>
  )

const kStatusTone: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-soft text-amber',
  PAID: 'bg-accent-soft text-accent-dark',
  SHIPPED: 'bg-[color-mix(in_srgb,var(--green)_16%,transparent)] text-green',
  DELIVERED: 'bg-green-soft text-green',
  CANCELLED: 'bg-danger-soft text-danger',
}

export const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`status-base ${kStatusTone[status]}`}>
    {statusLabel(status)}
  </span>
)

export const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    className="absolute top-3.5 right-4 z-2 grid place-items-center w-8.5 h-8.5 rounded-full bg-paper text-ink text-[1.25rem] leading-none shadow-[0_2px_10px_rgb(0_0_0/12%)] hover:bg-accent-soft"
    onClick={onClick}
    aria-label="Close"
  >
    ×
  </button>
)

export const EmptyPanel = ({
  title,
  children,
  tall = false,
  action,
}: {
  title: string
  children?: ReactNode
  tall?: boolean
  action?: ReactNode
}) => (
  <div className={tall ? 'empty-panel-tall' : 'empty-panel'}>
    <p className="mb-1.5 font-display text-[1.2rem]">{title}</p>
    {children}
    {action == null ? null : <div className="mt-4">{action}</div>}
  </div>
)

export const SkeletonGrid = () => (
  <div
    className="grid grid-cols-4 gap-6 max-[980px]:grid-cols-3 max-[760px]:grid-cols-2 max-[480px]:grid-cols-1"
    aria-label="Loading products"
  >
    <div className="skeleton" />
    <div className="skeleton" />
    <div className="skeleton" />
    <div className="skeleton" />
  </div>
)

const kToastTone: Record<ToastKind, string> = {
  ok: 'bg-ink text-cream',
  error: 'bg-danger text-white',
}

export const Toasts = () => {
  const { toasts } = useShop()
  return (
    <div className="pointer-events-none fixed bottom-7 left-1/2 z-100 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map(item => (
        <div
          key={item.id}
          role="status"
          className={`animate-toast-in max-w-full rounded-full px-5 py-3 text-center text-[0.88rem] shadow-[var(--shadow)] ${kToastTone[item.kind]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}

export const Footer = () => (
  <footer className="mx-auto flex max-w-[1180px] flex-wrap items-start justify-between gap-5 border-t border-line px-[clamp(20px,4vw,56px)] pt-7.5 pb-11.5 max-[760px]:flex-col">
    <div>
      <span className="font-display text-[0.9rem] font-600 tracking-[0.22em]">
        TEALINA{' '}
        <em className="font-400 tracking-[0.06em] text-accent not-italic">
          roasters
        </em>
      </span>
      <p className="mt-2 max-w-[48ch] text-[0.83rem] text-muted">
        A demo shop for the tealina toolchain. Data lives in memory and resets
        on restart.
      </p>
    </div>
    <div className="flex flex-wrap gap-5 text-[0.86rem]">
      <a
        className="text-muted no-underline hover:text-accent-dark hover:underline"
        href="/api-doc/index.html"
        target="_blank"
        rel="noreferrer"
      >
        API documentation
      </a>
      <a
        className="text-muted no-underline hover:text-accent-dark hover:underline"
        href="https://github.com/yeojz/tealina"
        target="_blank"
        rel="noreferrer"
      >
        tealina on GitHub
      </a>
    </div>
  </footer>
)

/** A small order-summary line reused by the admin feed and order lists. */
export const Money = ({ value }: { value: number }) => (
  <span className="price">{money(value)}</span>
)

export const DateText = ({ iso }: { iso: string }) => (
  <span className="muted">{shortDate(iso)}</span>
)
