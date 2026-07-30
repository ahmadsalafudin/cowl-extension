/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup/**/*.{html,js}",
    "./options/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        cowl: {
          primary: '#4F46E5',
          secondary: '#7C3AED',
          dark: '#1E1B4B',
          muted: '#6B7280'
        }
      }
    }
  },
  plugins: []
}
