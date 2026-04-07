/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nest-primary': '#14B8A6',
        'nest-primary-container': '#006b5f',
        'nest-bg': '#CFE8EA',
        'nest-surface': '#edfcff',
        'nest-surface-low': '#daf9ff',
        'nest-surface-lowest': '#ffffff',
        'nest-text-primary': '#0F3A40',
        'nest-text-secondary': '#4A787C',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
