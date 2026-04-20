import type { Config } from 'tailwindcss';

const config = {
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        decker: {
          flash: '#fde68a',
          miracle: '#93c5fd',
          strong: '#facc15',
          dynamic: '#f87171',
          overlay: '#1e1b4b',
        },
        hud: {
          bg: '#0b1020',
          panel: '#111a3a',
          accent: '#fbbf24',
        },
      },
      fontFamily: {
        kid: ['"ZCOOL KuaiLe"', 'system-ui', 'sans-serif'],
        digit: ['Orbitron', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'hud-glow': '0 0 0 2px rgba(251, 191, 36, 0.5), 0 12px 40px rgba(0, 0, 0, 0.45)',
        'hero-lift': '0 20px 45px -20px rgba(253, 230, 138, 0.6)',
      },
      keyframes: {
        'decker-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.05)', filter: 'brightness(1.3)' },
        },
        'decker-rise': {
          '0%': { opacity: '0', transform: 'scale(0.4) rotate(-12deg)' },
          '60%': { opacity: '1', transform: 'scale(1.15) rotate(6deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'finisher-ready': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(248, 113, 113, 0.6)' },
          '50%': { boxShadow: '0 0 28px rgba(251, 191, 36, 0.9)' },
        },
      },
      animation: {
        'decker-pulse': 'decker-pulse 1.4s ease-in-out infinite',
        'decker-rise': 'decker-rise 600ms ease-out forwards',
        'finisher-ready': 'finisher-ready 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
