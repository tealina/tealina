import { defineConfig, presetWind3 } from 'unocss'

/**
 * The palette is a set of CSS variables rather than fixed theme colours: the same
 * utility (`bg-paper`) then follows the system colour scheme with no `dark:` twin in
 * the components. Everything else here is ordinary UnoCSS.
 */
export default defineConfig({
  presets: [presetWind3()],
  theme: {
    colors: {
      cream: 'var(--cream)',
      paper: 'var(--paper)',
      ink: 'var(--ink)',
      'ink-soft': 'var(--ink-soft)',
      muted: 'var(--muted)',
      line: 'var(--line)',
      'line-strong': 'var(--line-strong)',
      accent: 'var(--accent)',
      'accent-dark': 'var(--accent-dark)',
      'accent-soft': 'var(--accent-soft)',
      green: 'var(--green)',
      'green-soft': 'var(--green-soft)',
      amber: 'var(--amber)',
      'amber-soft': 'var(--amber-soft)',
      danger: 'var(--danger)',
      'danger-soft': 'var(--danger-soft)',
    },
    fontFamily: {
      display:
        "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
      sans: "'Avenir Next', Avenir, 'Segoe UI', system-ui, -apple-system, sans-serif",
      mono: "'SFMono-Regular', ui-monospace, 'Cascadia Mono', Menlo, monospace",
    },
    animation: {
      keyframes: {
        shimmer: '{to{background-position:-200% 0}}',
        'fade-in': '{from{opacity:0}}',
        'slide-in': '{from{transform:translateX(36px);opacity:.4}}',
        'rise-in':
          '{from{transform:translate(-50%,calc(-50% + 16px));opacity:0}}',
        'toast-in': '{from{transform:translate(-50%,12px);opacity:0}}',
      },
      durations: {
        shimmer: '1.4s',
        'fade-in': '160ms',
        'slide-in': '220ms',
        'rise-in': '200ms',
        'toast-in': '220ms',
      },
      timingFns: {
        shimmer: 'linear',
        'fade-in': 'ease',
        'slide-in': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'rise-in': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'toast-in': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      counts: { shimmer: 'infinite' },
    },
  },
  shortcuts: {
    'btn-base':
      'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.75 text-[0.92rem] font-600 leading-none whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-solid':
      'btn-base bg-ink text-cream hover:bg-accent-dark disabled:hover:bg-ink',
    'btn-ghost':
      'btn-base bg-transparent text-ink border border-line-strong hover:bg-paper hover:border-accent',
    'btn-danger-ghost':
      'btn-base bg-transparent text-danger border border-[color-mix(in_srgb,var(--danger)_45%,transparent)] hover:bg-danger-soft',
    'btn-small': 'px-3.5 py-1.75 text-[0.83rem]',
    'btn-wide': 'w-full',

    'link-button':
      'p-0 text-muted text-[0.85rem] underline decoration-line-strong underline-offset-3 hover:text-accent-dark',
    'link-danger':
      'p-0 text-muted text-[0.85rem] underline decoration-line-strong underline-offset-3 hover:text-danger',

    eyebrow:
      'mb-3 text-[0.73rem] font-700 tracking-[0.18em] uppercase text-accent',
    'section-sub': 'mt-1.5 text-muted text-[0.94rem]',
    muted: 'text-muted',

    chip: 'px-3.75 py-1.75 rounded-full border border-line-strong bg-transparent text-ink-soft text-[0.86rem] transition-colors hover:border-accent hover:text-accent-dark',
    'chip-active':
      'px-3.75 py-1.75 rounded-full border border-ink bg-ink text-cream text-[0.86rem]',

    field:
      'w-full px-3 py-2.5 rounded-[9px] border border-line-strong bg-cream text-ink text-[0.92rem] font-400 tracking-normal focus:outline-none focus:border-accent focus:bg-paper',
    label:
      'flex flex-col gap-1.5 text-[0.78rem] font-600 tracking-[0.04em] text-muted',

    panel: 'p-[22px_24px] bg-paper border border-line rounded-[18px]',
    scrim:
      'fixed inset-0 z-50 bg-[rgb(24_18_14/42%)] backdrop-blur-[2px] animate-fade-in',
    'scrim-modal':
      'fixed inset-0 z-70 bg-[rgb(24_18_14/42%)] backdrop-blur-[2px] animate-fade-in',
    drawer:
      'fixed top-0 right-0 z-60 flex h-dvh w-[min(480px,100vw)] flex-col overflow-y-auto bg-paper shadow-[-30px_0_60px_-40px_rgb(30_20_14/65%)] animate-slide-in',
    modal:
      'fixed top-1/2 left-1/2 z-80 max-h-[calc(100dvh-40px)] w-[min(430px,calc(100vw-32px))] overflow-y-auto rounded-[18px] bg-paper p-[30px_30px_26px] -translate-x-1/2 -translate-y-1/2 shadow-[var(--shadow)] animate-rise-in',
    'empty-panel':
      'px-6 py-10.5 border border-dashed border-line-strong rounded-[18px] text-center',
    'empty-panel-tall':
      'px-6 py-20 mt-7 border border-dashed border-line-strong rounded-[18px] text-center',

    avatar:
      'grid place-items-center w-8 h-8 rounded-full bg-accent-soft text-accent-dark text-[0.75rem] font-700 tracking-[0.04em] shrink-0',
    'avatar-small':
      'grid place-items-center w-6.5 h-6.5 rounded-full bg-accent-soft text-accent-dark text-[0.66rem] font-700 tracking-[0.04em] shrink-0',
    'mini-art':
      'grid place-items-center w-10 h-10 shrink-0 rounded-[10px] text-[1.15rem]',
    'mini-art-small':
      'grid place-items-center w-8.5 h-8.5 shrink-0 rounded-[10px] text-[0.95rem]',

    skeleton:
      'h-[280px] rounded-[18px] bg-[linear-gradient(100deg,var(--line)_30%,var(--paper)_45%,var(--line)_60%)] bg-[length:240%_100%] animate-shimmer',
    'skeleton-tall':
      'h-[420px] rounded-[18px] bg-[linear-gradient(100deg,var(--line)_30%,var(--paper)_45%,var(--line)_60%)] bg-[length:240%_100%] animate-shimmer',

    'status-base':
      'inline-flex items-center px-2.5 py-0.75 rounded-full text-[0.7rem] font-700 tracking-[0.08em] uppercase whitespace-nowrap',
    'stock-pill':
      'px-2.25 py-0.5 rounded-full text-[0.75rem] font-700 whitespace-nowrap',

    'product-card':
      'flex flex-col overflow-hidden bg-paper border border-line rounded-[18px] transition duration-160 hover:-translate-y-0.75 hover:shadow-[var(--shadow)]',
    'product-art':
      'relative grid place-items-center w-full aspect-[4/3] text-white',
    badge:
      'absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[rgb(20_14_10/78%)] text-white text-[0.7rem] tracking-[0.05em] uppercase',
    'badge-low':
      'absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-soft text-amber text-[0.7rem] tracking-[0.05em] uppercase',

    price: 'font-display text-[1.06rem] font-600',
    'price-big': 'font-display text-[1.6rem] font-600',
  },
  preflights: [
    {
      getCSS: () => `
:root {
  --cream: #f6efe4;
  --paper: #fffdf9;
  --ink: #2a211b;
  --ink-soft: #4d4036;
  --muted: #7b6c5e;
  --line: #e3d6c4;
  --line-strong: #d2c0a8;
  --accent: #b4552d;
  --accent-dark: #8d3d1d;
  --accent-soft: #f2e0d3;
  --green: #3f6b4f;
  --green-soft: #e2ede3;
  --amber: #a5761b;
  --amber-soft: #f6ecd2;
  --danger: #9b3a32;
  --danger-soft: #f6e0dc;
  --shadow: 0 18px 40px -24px rgb(42 33 27 / 55%);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --cream: #171310;
    --paper: #211b17;
    --ink: #f4ece1;
    --ink-soft: #ddd0c2;
    --muted: #a49485;
    --line: #382e27;
    --line-strong: #4b3d33;
    --accent: #e08a5f;
    --accent-dark: #f0a27c;
    --accent-soft: #3a261c;
    --green: #9ec7a9;
    --green-soft: #24322a;
    --amber: #e2bd70;
    --amber-soft: #362d1b;
    --danger: #e6958b;
    --danger-soft: #3a211e;
    --shadow: 0 18px 40px -20px rgb(0 0 0 / 70%);
    color-scheme: dark;
  }
}
html { scroll-behavior: smooth; }
body {
  background: var(--cream);
  color: var(--ink);
  font-family: 'Avenir Next', Avenir, 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
::selection { background: var(--accent-soft); color: var(--ink); }
@keyframes shimmer { to { background-position: -200% 0; } }
@keyframes fade-in { from { opacity: 0; } }
@keyframes slide-in { from { transform: translateX(36px); opacity: 0.4; } }
@keyframes rise-in { from { transform: translate(-50%, calc(-50% + 16px)); opacity: 0; } }
@keyframes toast-in { from { transform: translate(-50%, 12px); opacity: 0; } }
`,
    },
  ],
})
