/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './index.ts', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#F9F7F2',
        surface: '#FFFFFF',
        ink: '#333333',
        secondary: '#666666',
        muted: '#999999',
        cinnabar: '#C62828',
        mist: '#E8E2D8',
        jade: '#4A675B',
        gold: '#B08A4A',
      },
      spacing: {
        1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px', '4xl': '32px' },
    },
  },
  plugins: [],
};
