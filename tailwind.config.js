/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#d6b26a',
          purple: '#8f3d4f',
          cyan: '#7ca79f',
        },
        ink: {
          950: '#110f0d',
          900: '#1f1914',
          800: '#2f261d',
        },
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(214,178,106,0.32), 0 16px 40px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};