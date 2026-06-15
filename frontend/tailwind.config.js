/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1D9E75',
          'green-dark': '#0F6E56',
          'green-light': '#E1F5EE',
          blue: '#185FA5',
          'blue-light': '#E6F1FB',
          amber: '#EF9F27',
          'amber-light': '#FAEEDA',
          red: '#E24B4A',
          'red-light': '#FCEBEB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
