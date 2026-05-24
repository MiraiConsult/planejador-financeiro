import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // MC Castro brand: azul institucional (gradiente #2B5EA7 → #4B8BCB)
        brand: {
          50: '#eef4fb',
          100: '#d9e7f6',
          200: '#b3cfed',
          300: '#7caede',
          400: '#4b8bcb',
          500: '#3373b5',
          600: '#2b5ea7',
          700: '#244d8a',
          800: '#1e3f6e',
          900: '#1a345a',
          950: '#0f1f38',
        },
        // Surface colors (CSS vars pra dark mode)
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
        },
        on: {
          DEFAULT: 'rgb(var(--on-surface) / <alpha-value>)',
          muted: 'rgb(var(--on-surface-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-color) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xs': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        'display-sm': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
        'display-lg': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'soft-lg': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 10px 30px -10px rgb(0 0 0 / 0.1)',
        glow: '0 0 0 1px rgb(43 94 167 / 0.15), 0 4px 16px -2px rgb(43 94 167 / 0.25)',
        'inner-glow': 'inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-slate':
          'linear-gradient(to right, rgb(var(--on-surface) / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--on-surface) / 0.04) 1px, transparent 1px)',
        'mesh-brand':
          'radial-gradient(at 0% 0%, rgb(43 94 167 / 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgb(75 139 203 / 0.1) 0px, transparent 50%), radial-gradient(at 50% 100%, rgb(43 94 167 / 0.05) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-right': 'slideRight 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
