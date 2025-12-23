/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': '#ffffff',
        'bg-surface': '#f8f8f8',
        'bg-surface-dark': '#efefef',
        'text-primary': '#1f1f1f',
        'text-secondary': '#777777',
        'accent-brand': '#5422b0',
        'color-icon-default': '#777777',
        'color-icon-active': '#5422b0',
        'color-border': '#e0e0e0',
        'color-separator': '#e0e0e0',
        'color-highlight': '#F0E6F7',
        'color-overlay': 'rgba(31, 31, 31, 0.1)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'base': '1.125rem',
        'h1': '1.5rem',
        'h2': '1.25rem',
        'h3': '1.125rem',
      },
      fontWeight: {
        normal: 400,
        bold: 700,
      },
    },
  },
  plugins: [],
}
