import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#022e2e',
        surface:  '#043a3a',
        surface2: '#032e2e',
        border:   '#0a5252',
        accent:   '#0d9488',
        blue:     '#60a5fa',
        green:    '#10b981',
        orange:   '#f97316',
        amber:    '#fbbf24',
        red:      '#ef4444',
        muted:    '#1a5555',
        subtle:   '#2e7a7a',
        dim:      '#5aabab',
      },
      fontFamily: {
        display: ['IBM Plex Sans', 'sans-serif'],
        body:    ['IBM Plex Sans', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },
    },
  },
} satisfies Config
