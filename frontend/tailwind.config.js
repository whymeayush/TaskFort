/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tf: {
          bg: '#F8F9FB',
          surface: '#FFFFFF',
          charcoal: '#20242C',
          slate: '#727987',
          muted: '#9CA3AF',
          border: '#E7E9EF',
          'border-subtle': '#F0F2F6',
          indigo: {
            DEFAULT: '#4F5FE8',
            hover: '#4150D8',
            light: '#EEF1FD',
            tint: '#F4F6FE',
            text: '#3D4BC9'
          },
          green: {
            DEFAULT: '#10B981',
            light: '#ECFDF5',
            border: '#D1FAE5',
            text: '#065F46'
          },
          amber: {
            DEFAULT: '#F59E0B',
            light: '#FFFBEB',
            border: '#FEF3C7',
            text: '#92400E'
          },
          red: {
            DEFAULT: '#EF4444',
            light: '#FEF2F2',
            border: '#FEE2E2',
            text: '#991B1B'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        'tf-sm': '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'tf-card': '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'tf-popover': '0 4px 16px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        'tf-modal': '0 12px 32px -4px rgba(16, 24, 40, 0.12), 0 4px 8px -2px rgba(16, 24, 40, 0.06)'
      }
    },
  },
  plugins: [],
}
