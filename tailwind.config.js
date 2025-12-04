/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'comic': ['Rubik', 'sans-serif'], // הפונט המיוחד לקומיקס
      },
      // הגדרת אנימציה איטית לכוכבים/רקע אם נצטרך
      animation: {
        'spin-slow': 'spin 3s linear infinite', 
      }
    },
  },
  plugins: [
    // פלאגין להוספת הצללות קשות (Hard Shadows) בסגנון קומיקס
    function ({ addUtilities }) {
      addUtilities({
        '.text-shadow-black': {
          'text-shadow': '2px 2px 0px #000000',
        },
        '.text-shadow-white': {
          'text-shadow': '2px 2px 0px #ffffff',
        },
      })
    }
  ],
}