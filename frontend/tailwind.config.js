/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#F4C400',
          navy: '#0B1330',
          gray: '#F3F4F6',
          darkYellow: '#D3A700',
          lightNavy: '#1E294B',
          softWhite: '#FFFFFF',
          textNavy: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
