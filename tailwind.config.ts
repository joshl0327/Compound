import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        border:   'var(--color-border)',
        accent:   'var(--color-accent)',
        blue:     '#60a5fa',
        green:    '#10b981',
        orange:   '#f97316',
        amber:    '#fbbf24',
        red:      '#ef4444',
        muted:    'var(--color-text-muted)',
        subtle:   'var(--color-text-muted)',
        dim:      'var(--color-text-dim)',
      },
      fontFamily: {
        display: ['IBM Plex Sans', 'sans-serif'],
        body:    ['IBM Plex Sans', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },
    },
  },
} satisfies Config
