/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1120',
        surface: '#131c31',
        'surface-2': '#1a2640',
        border: '#1e3050',
        primary: '#00ff88',
        'primary-dim': '#00cc6a',
        accent: '#4a9eff',
        text: '#e0e6f0',
        'text-dim': '#8892a8',
        danger: '#ff5555',
        warning: '#ffaa33',
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Fira Code'", "'JetBrains Mono'", "'Cascadia Code'", 'monospace'],
      },
    },
  },
  plugins: [],
}
