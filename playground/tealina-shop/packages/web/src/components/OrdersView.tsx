import { money, shortDate, statusLabel } from '../format'
import { useShop } from '../store'
import type { OrderStatus, OrderView } from '../types'
import { EmptyPanel, MiniArt, StatusBadge } from './ui'

const kStatusOrder: OrderStatus[] = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const kNextStatus: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

const OrderCard = ({
  order,
  isAdmin,
}: {
  order: OrderView
  isAdmin: boolean
}) => {
  const { actions } = useShop()
  const next = isAdmin ? kNextStatus[order.status] : []

  return (
    <article className="rounded-[18px] border border-line bg-paper px-5.5 py-5">
      <header className="flex items-start justify-between gap-3.5 border-b border-line pb-3.5">
        <div>
          <h3 className="font-mono text-[0.98rem] font-600">{order.orderNo}</h3>
          <p className="text-muted">
            {shortDate(order.createdAt)}
            {isAdmin ? ` · ${order.customerName}` : ''}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <ul className="grid gap-2.5 py-4">
        {order.items.map(item => (
          <li
            key={`${order.id}-${item.productId}`}
            className="flex items-center gap-3"
          >
            <MiniArt accent={item.accent}>{item.emoji}</MiniArt>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem]">
              {item.name}
            </span>
            <span className="text-[0.82rem] text-muted">× {item.quantity}</span>
            <span className="whitespace-nowrap font-mono text-[0.86rem]">
              {money(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>

      {order.note == null ? null : (
        <p className="border-l-[3px] border-line-strong px-3.5 py-2.5 text-[0.86rem] italic text-muted">
          “{order.note}”
        </p>
      )}

      <footer className="flex items-baseline justify-between border-t border-line pt-3.5">
        <span className="text-muted">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
        </span>
        <span className="font-display text-[1.3rem] font-600">
          {money(order.total)}
        </span>
      </footer>

      {next.length === 0 ? null : (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {next.map(status => (
            <button
              key={status}
              type="button"
              className={`btn-small ${
                status === 'CANCELLED' ? 'btn-danger-ghost' : 'btn-solid'
              }`}
              onClick={() => void actions.advanceOrder(order.id, status)}
            >
              Mark {statusLabel(status).toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

export const OrdersView = () => {
  const { state, actions } = useShop()

  if (state.session == null) {
    return (
      <section className="mx-auto min-h-[62vh] max-w-[1180px] px-[clamp(20px,4vw,56px)] pt-[clamp(32px,5vw,64px)] pb-20">
        <EmptyPanel
          tall
          title="Your orders live here."
          action={
            <button
              type="button"
              className="btn-solid"
              onClick={() => actions.openAuth('login')}
            >
              Sign in
            </button>
          }
        >
          <p>Sign in to see this page. The demo ships with two accounts.</p>
        </EmptyPanel>
      </section>
    )
  }

  const isAdmin = state.session.user.role === 'ADMIN'
  const list = state.orders

  return (
    <section className="mx-auto min-h-[62vh] max-w-[1180px] px-[clamp(20px,4vw,56px)] pt-[clamp(32px,5vw,64px)] pb-20">
      <div className="mb-6.5 flex flex-wrap items-end justify-between gap-4.5">
        <div>
          <p className="eyebrow">
            {isAdmin ? 'Every order in the shop' : 'Your shelf history'}
          </p>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-500 tracking-[-0.01em]">
            Orders
          </h1>
          <p className="section-sub">
            {isAdmin
              ? 'Advance an order through fulfilment; cancelling returns the units to stock.'
              : 'Placed from this browser, newest first.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {isAdmin ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void actions.exportOrders()}
            >
              Export CSV
            </button>
          ) : null}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void actions.refreshOrders()}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={state.ordersFilter === '' ? 'chip-active' : 'chip'}
          onClick={() => actions.setOrdersFilter('')}
        >
          All
        </button>
        {kStatusOrder.map(status => (
          <button
            key={status}
            type="button"
            className={state.ordersFilter === status ? 'chip-active' : 'chip'}
            onClick={() => actions.setOrdersFilter(status)}
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>

      {list == null ? (
        <div className="skeleton-tall mt-5.5" aria-label="Loading orders" />
      ) : list.length === 0 ? (
        <div className="mt-5.5">
          <EmptyPanel
            title="No orders yet."
            action={
              <button
                type="button"
                className="btn-solid"
                onClick={() => actions.go('shop')}
              >
                Back to the shop
              </button>
            }
          >
            <p>Add something to the cart and check out.</p>
          </EmptyPanel>
        </div>
      ) : (
        <div className="mt-5.5 grid gap-4.5">
          {list.map(order => (
            <OrderCard key={order.id} order={order} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </section>
  )
}
