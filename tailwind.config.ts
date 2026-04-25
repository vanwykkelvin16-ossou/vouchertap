import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        red: {
          primary: '#FF3B30',
          deep:    '#D70015',
          soft:    '#FFE5E5',
        },
        text: {
          primary:   '#1D1D1F',
          secondary: '#86868B',
        },
        border: '#F5F5F7',
        success: '#34C759',
      },
      fontFamily: {
        sans: ['-apple-system','BlinkMacSystemFont','"SF Pro Display"','Inter','sans-serif'],
        mono: ['"SF Mono"','"JetBrains Mono"','monospace'],
      },
      borderRadius: {
        btn: '12px',
        card: '16px',
        hero: '24px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config
