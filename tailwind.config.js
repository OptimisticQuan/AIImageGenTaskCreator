/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1f2937',
          surface: '#374151',
          border: '#4b5563',
          text: '#f9fafb',
          muted: '#9ca3af'
        }
      }
    },
  },
  plugins: [],
}
