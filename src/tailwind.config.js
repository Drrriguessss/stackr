/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0a0a0a',
          900: '#1a1a1a',
          850: '#1f1f1f',
          800: '#2a2a2a',
          750: '#333333',
          700: '#404040',
        },
        blue: {
          600: '#667eea',
          700: '#5a67d8',
        }
      },
    },
  },
  plugins: [],
}