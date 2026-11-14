/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['DM Sans', 'ui-sans-serif', 'system-ui'] },
      colors: { forest: '#063b36', ink: '#102a28', canvas: '#f4f5ef' },
    },
  },
  plugins: [],
}
