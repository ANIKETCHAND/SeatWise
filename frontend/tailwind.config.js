/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f9',
          100: '#dce5f1',
          200: '#bccfe5',
          300: '#94b2d4',
          400: '#6790c0',
          500: '#4773aa',
          600: '#355c8e',
          700: '#2a4872',
          800: '#1d314e',
          900: '#0f1d31', // University Navy
          950: '#080f1a',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
