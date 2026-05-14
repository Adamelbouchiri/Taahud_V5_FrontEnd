/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Class-strategy dark mode: ThemeContext adds/removes `dark` on
  // <html>, then `dark:bg-...` / `dark:text-...` utilities light up.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2c2f7c',
          dark: '#1f2258',
          light: '#3a3d99',
        },
        secondary: {
          DEFAULT: '#136d4a',
          dark: '#0d5538',
          light: '#1a8a5d',
        },
        cream: '#f4f1e9',
        ink: {
          DEFAULT: '#0f1129',
          soft: '#3a3a52',
        },
        muted: '#7a7a8c',
        canvas: '#fafaf6',
        'app-border': '#e5e3dc',
        danger: '#b91c1c',
      },
      fontFamily: {
        // Font families read from CSS custom properties so the active
        // language (set on <html lang="...">) can swap the stack:
        //   ar → Thmanyah (locally bundled)
        //   en → Inter / DM Serif Display (Google Fonts)
        //   zh → Noto Sans SC / Noto Serif SC (Google Fonts)
        // The variable defaults live in src/styles/globals.css.
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        serif: ['var(--font-serif)'],
      },
      animation: {
        'fade-up': 'fadeUp 0.45s ease-out backwards',
        'fade-in': 'fadeIn 0.35s ease-out backwards',
        'scale-in': 'scaleIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'slide-up-soft': 'slideUpSoft 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'slide-in-end': 'slideInEnd 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'float-slow': 'float 6s ease-in-out infinite',
        'ring-pulse': 'ringPulse 2s ease-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUpSoft: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // RTL-friendly slide. translateX(20px) feels like "from the
        // end side" in RTL — i.e. from the right in Arabic layout.
        slideInEnd: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        ringPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(19, 109, 74, 0.45)' },
          '70%': { boxShadow: '0 0 0 16px rgba(19, 109, 74, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(19, 109, 74, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
