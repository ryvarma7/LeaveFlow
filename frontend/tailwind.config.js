/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist Variable', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono Variable', 'Geist Mono', 'monospace'],
      },
      colors: {
        canvas: '#F5F6F8',
        surface: '#FFFFFF',
        border: '#E4E7EC',
        accent: {
          DEFAULT: '#0B6E6E',
          hover: '#095A5A',
          light: '#E6F4F4',
        },
        text: {
          primary: '#101828',
          secondary: '#475467',
          muted: '#667085',
        },
      },
      borderRadius: {
        card: '10px',
        control: '6px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16,24,40,0.05)',
      },
    },
  },
  plugins: [],
};
