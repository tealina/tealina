import type { TagProps } from 'antd'
const kMethodColors: Record<string, TagProps['color']> = {
  get: 'blue',
  post: 'green',
  put: 'gold',
  patch: 'orange',
  delete: 'red',
  // head: '#909399',
  // options: '#909399',
  trace: 'purple',
  connect: 'purple',
}

export function getMethodColor(method: string) {
  const color =
    kMethodColors[method.toLowerCase() as keyof typeof kMethodColors]
  return color
}
