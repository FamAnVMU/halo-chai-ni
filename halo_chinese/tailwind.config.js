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
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#e11d48', // Chinese auspicious red / accent
          600: '#be123c',
          700: '#9f1239',
          800: '#881337',
          900: '#4c0519',
        },
        lime: {
          50: '#F6FAF2',
          100: '#EAF5D5',
          200: '#D7EDB5',
          300: '#C2E58C',
          400: '#B2DE5C',
          500: '#A3D635', // Brand Lime primary
          600: '#86B825',
          700: '#5F881A',
          800: '#466714',
          900: '#355A26', // Deep forest lime
          950: '#1E3514',
        },
        halo: {
          bg: '#FFFFFF',
          canvas: '#F6FAF2',
          card: '#FFFFFF',
          cardDark: '#1A2418',
          border: '#E3EBDD',
          borderDark: '#2D3A2C',
          text: '#263326',
          textMuted: '#647560',
          darkBg: '#121811',
          lime: '#A3D635',
          limeLight: '#EAF5D5',
          limeDark: '#355A26'
        },
        jade: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        chinese: ['"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans SC"', '"Noto Sans TC"', 'SimSun', 'sans-serif'],
        kaiti: ['"KaiTi"', '"STKaiti"', 'serif']
      }
    },
  },
  plugins: [],
}
