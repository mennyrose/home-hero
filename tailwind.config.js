/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'comic': ['Rubik', 'sans-serif'], // שימוש בפונט שהגדרנו ב-CSS
      },
      textShadow: {
        'black': '2px 2px 0px #000000', // צללית קשה שחורה לטקסט
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite', // אנימציה איטית לכוכבים
      }
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-black': {
          textShadow: '2px 2px 0px #000000',
        },
        '.text-shadow-white': {
          textShadow: '2px 2px 0px #ffffff',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}