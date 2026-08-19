/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae3',
          300: '#b0bac9',
          400: '#8693ab',
          500: '#67748d',
          600: '#525c73',
          700: '#434b5e',
          800: '#3a4050',
          900: '#1f2330',
          950: '#13161f',
        },
        brand: {
          50: '#eefcf6',
          100: '#d6f7e9',
          200: '#b0eed5',
          300: '#7adcbd',
          400: '#42c79e',
          500: '#1eaf83',
          600: '#128d69',
          700: '#0f7155',
          800: '#105a46',
          900: '#0f493a',
          950: '#062a20',
        },
        accent: {
          50: '#fff8eb',
          100: '#ffedc6',
          200: '#ffd988',
          300: '#ffc043',
          400: '#ffa61a',
          500: '#f58500',
          600: '#c2620a',
          700: '#9a4a0d',
          800: '#7c3c11',
          900: '#663212',
        },
        success: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31,35,48,0.04), 0 2px 8px rgba(31,35,48,0.06)',
        card: '0 1px 3px rgba(31,35,48,0.06), 0 8px 24px -8px rgba(31,35,48,0.08)',
        pop: '0 12px 40px -12px rgba(31,35,48,0.22)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
