/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        appleBlack: '#000000',
        appleSecondary: '#0A0A0A',
        appleGlass: 'rgba(28,28,30,0.72)',
        appleBorder: 'rgba(255,255,255,0.08)',
        appleTextPrimary: '#F5F5F7',
        appleTextSecondary: '#A1A1AA',
        appleBlue: '#0A84FF',
        appleIndigo: '#6366F1',
        appleRose: '#FB7185',
      },
      borderRadius: {
        'apple': '28px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
