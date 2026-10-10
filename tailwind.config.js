/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent-color)',
        'accent-hover': 'var(--accent-hover)',
        ink: '#0F172A',
        paper: '#F8FAFC',
        gold: '#EAB308'
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Fraunces', 'serif']
      }
    }
  },
  plugins: []
};
