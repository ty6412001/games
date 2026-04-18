import type { Config } from 'tailwindcss';

const config = {
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

export default config;
