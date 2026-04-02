import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#030305',
        card: '#0c0c18',
        border: '#222240',
        purple: '#7c6df5',
        cyan: '#00d4d4',
        green: '#00e096',
        yellow: '#ffc947',
        pink: '#ff6b9d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
