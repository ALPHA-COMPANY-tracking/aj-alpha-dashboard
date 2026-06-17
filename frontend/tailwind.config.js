/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0a07',
        surface: '#15130d',
        'surface-2': '#201c12',
        border: '#332b1b',
        muted: '#b1a487',
        foreground: '#f5efe2',
        // Acento dourado.
        accent: {
          DEFAULT: '#e6b23a',
          soft: 'rgba(230, 178, 58, 0.14)',
        },
        indigo2: '#b8860b', // dourado escuro (gradiente)
        violet2: '#f5d061', // dourado claro (destaques)
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
        'accent-gradient': 'linear-gradient(135deg, #b8860b 0%, #e6b23a 50%, #f5d061 100%)',
        'accent-gradient-soft':
          'linear-gradient(135deg, rgba(184,134,11,0.25) 0%, rgba(245,208,97,0.25) 100%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(230,178,58,0.25), 0 12px 40px -12px rgba(230,178,58,0.45)',
        card: '0 18px 40px -24px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
}
