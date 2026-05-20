import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#070e16',
        surface:  '#111c28',
        surface2: '#0d1620',
        border:   '#1a2840',
        blue:     '#60a5fa',
        green:    '#10b981',
        orange:   '#f97316',
        amber:    '#fbbf24',
        red:      '#ef4444',
        muted:    '#3a5a7a',
        subtle:   '#4a7fa5',
        dim:      '#8b9cb5',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
    },
  },
} satisfies Config
