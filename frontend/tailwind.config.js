/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        cacao: {
          DEFAULT: '#6D4C41',
          dark:    '#3E2723',
          light:   '#A1887F',
        },
        gold: {
          DEFAULT: '#FFB74D',
          dark:    '#FF8F00',
          light:   '#FFE0B2',
        },
        // Backgrounds
        cream:    '#FFF8F0',
        linen:    '#FAF0E6',
        espresso: {
          DEFAULT: '#2C1F1A',
          card:    '#3A2A22',
        },
        // Semantic
        success: {
          DEFAULT: '#4CAF50',
          bg:      '#E8F5E9',
        },
        warning: {
          DEFAULT: '#FFA726',
          bg:      '#FFF3E0',
        },
        danger: {
          DEFAULT: '#E53935',
          bg:      '#FFEBEE',
        },
        info: {
          DEFAULT: '#42A5F5',
          bg:      '#E3F2FD',
        },
        // Text
        'text-dark':  '#3E2723',
        'text-muted': '#8D6E63',
        'text-light': '#F5EDE4',
        // UI
        border:   '#D7CCC8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
    },
  },
  plugins: [],
}