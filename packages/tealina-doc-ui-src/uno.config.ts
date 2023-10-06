import { defineConfig } from 'unocss'

export default defineConfig({
  theme: {
    animation: {
      keyframes: {
        'slide-to-left':
          '{from{transform:translate3d(-100%,0,0);}to{transform:translate3d(0,0,0)}}',
        'slide-to-right':
          '{from{transform:translate3d(100%,0,0);}to{transform:translate3d(0,0,0)}}',
      },
    },
  },
})
