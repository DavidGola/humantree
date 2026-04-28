/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#52b788',
          600: '#40916c',
          700: '#2d6a4f',
          800: '#1b4332',
          900: '#0d2818',
        },
        accent: {
          400: '#e8a87c',
          500: '#c1666b',
          600: '#a3445a',
        },
        earth: {
          100: '#f5f0e8',
          200: '#e8dfd2',
          300: '#d4c4a8',
          400: '#b8a080',
          500: '#9c8060',
        },
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'modal-enter': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'modal-enter': 'modal-enter 150ms ease-out',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
