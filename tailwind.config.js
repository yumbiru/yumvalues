/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        fontFamily: {
          cartoon: ['Comic Sans MS', 'Comic Sans', 'cursive'],
          flashy: ['Rubik Doodle Shadow', 'system-ui'],
        },
        keyframes: {
          wiggle: {
            '0%, 100%': { transform: 'rotate(-3deg)' },
            '50%': { transform: 'rotate(3deg)' },
          },
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
          }
        },
        animation: {
          wiggle: 'wiggle 1s ease-in-out infinite',
          float: 'float 3s ease-in-out infinite',
        }
      },
    },
    plugins: [],
  };