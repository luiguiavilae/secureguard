import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8eaf6',
          100: '#c5cae9',
          500: '#3949ab',
          600: '#1a237e',
          700: '#0d1b5e',
        },
      },
      keyframes: {
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-in-95': {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateX(-50%) translateY(-48%)' },
          '100%': { transform: 'translateX(-50%) translateY(-50%)' },
        },
      },
      animation: {
        ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'in': 'fade-in 150ms ease-out',
        'out': 'fade-in 150ms ease-in reverse',
      },
    },
  },
  plugins: [],
};

export default config;
