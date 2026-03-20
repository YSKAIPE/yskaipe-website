/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body: ['var(--font-lora)', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        ink:     '#0d0d0d',
        paper:   '#f4f0e4',
        aged:    '#e8e0c8',
        fog:     '#8a8070',
        finance: '#f7931a',
        sustain: '#3d6b2a',
        garden:  '#a03060',
        ai:      '#1a3a8f',
        exit:    '#00c853',
      },
    },
  },
  plugins: [],
}
