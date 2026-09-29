/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E11D48',
          light: '#FFF1F2',
          dark: '#F43F5E',
          muted: '#FFE4E6',
        },
        surface: {
          light: '#FAFAFA',
          cardLight: '#FFFFFF',
          subtleLight: '#F4F4F5',
          borderLight: '#E4E4E7',
          dark: '#09090B',
          cardDark: '#121215',
          subtleDark: '#18181B',
          borderDark: '#27272A',
        },
      },
    },
  },
  plugins: [],
};
