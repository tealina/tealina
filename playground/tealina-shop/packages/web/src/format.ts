export const money = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')

export const stars = (rating: number) => {
  const filled = Math.round(rating)
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(filled)
}

export const statusLabel = (status: string) =>
  ({
    PENDING: 'Pending',
    PAID: 'Paid',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  })[status] ?? status
