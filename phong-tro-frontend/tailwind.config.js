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
        'nest-bg': '#F5FDFF',
        'nest-surface': '#F0FBFA',
        'nest-surface-low': '#E6F8F7',
        'nest-surface-lowest': '#ffffff',
        'nest-text-primary': '#0F3A40',
        'nest-text-secondary': '#5A8B91',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
