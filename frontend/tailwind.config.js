/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#070a16',
        surface: '#101728',
        'surface-2': '#18213a',
        border: '#232f4d',
        muted: '#8b97bd',
        foreground: '#eef1fb',
        // Acento principal (violeta/índigo) — inspirado na referência.
        accent: {
          DEFAULT: '#8b5cf6',
          soft: 'rgba(139, 92, 246, 0.14)',
        },
        indigo2: '#6366f1',
        violet2: '#a855f7',
        positive: '#34d399',
        negative: '#fb7185',
        warning: '#fbbf24',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.15rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        'accent-gradient-soft':
          'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.25), 0 12px 40px -12px rgba(139,92,246,0.45)',
        card: '0 18px 40px -24px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
}
