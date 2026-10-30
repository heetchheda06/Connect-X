/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          alt: 'var(--bg-surface-alt)',
        },
        border: {
          main: 'var(--border-main)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        brand: {
          50: '#ECFEFF',
          100: '#CFF8FB',
          200: '#A5EEF5',
          300: '#67DDE9',
          400: '#26C4D8',
          500: '#0EA5C6', // Primary brand color
          600: '#0A87A8', // Hover state
          700: '#0B6E88',
          800: '#0F586D',
          900: '#0F485A',
        },
        deep: {
          900: '#062C4A', // Icon rail / hero panel
          800: '#0B3A5E',
        },
        accent: {
          coral: '#FF7A59',
          'coral-hover': '#F06847',
        },
        status: {
          online: '#22C55E',
          offline: '#B8CCD3',
          danger: '#EF4444',
          warning: '#F59E0B',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        button: '12px',
        card: '18px',
        bubble: '18px',
        'bubble-tail': '6px',
      },
      boxShadow: {
        brand: '0 8px 30px rgba(14, 165, 198, 0.14)',
        'brand-lg': '0 12px 36px rgba(14, 165, 198, 0.20)',
        soft: '0 4px 20px rgba(11, 42, 60, 0.06)',
        card: '0 6px 24px rgba(14, 165, 198, 0.08)',
        subtle: '0 2px 8px rgba(11, 42, 60, 0.04)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0A6BD6 0%, #0EA5C6 50%, #14C8A8 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #0959B5 0%, #0A87A8 50%, #10A68C 100%)',
        'deep-ocean': 'linear-gradient(160deg, #062C4A 0%, #0A6BD6 55%, #14C8A8 100%)',
      },
    },
  },
  plugins: [],
};
