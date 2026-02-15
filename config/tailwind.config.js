/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "../index.html",
    "../src/**/*.{js,ts,jsx,tsx}",
    "../pages/**/*.html",
    "../assets/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a2332',
          dark: '#0f1419',
          light: '#2d3748',
        },
        secondary: {
          DEFAULT: '#2563eb',
          dark: '#1e40af',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        'emerald-main': '#10b981',
        'emerald-dark': '#059669',
        'emerald-light': '#d1fae5',
        'swift-green': '#059669',
        'swift-green-dark': '#047857',
        'swift-blue': '#1e3a8a',
        'swift-dark': '#0f172a',
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
