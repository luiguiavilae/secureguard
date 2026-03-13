// TODO: Extender theme con colores de marca SecureGuard
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
    },
  },
  plugins: [],
};

export default config;
