/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Paleta do Digivice — ajustar conforme design final
        primary: '#1a1a2e',
        surface: '#16213e',
        accent: '#0f3460',
        highlight: '#e94560',
        healthy: '#4ade80',
        sick: '#f87171',
        sleeping: '#60a5fa',
        critical: '#fb923c',
      },
    },
  },
  plugins: [],
}
