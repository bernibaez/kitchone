/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        muted: token('muted'),
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
          soft: token('accent-soft'),
          on: token('on-accent'),
        },
        ink: {
          DEFAULT: token('ink'),
          hover: token('ink-hover'),
          on: token('on-ink'),
        },
        ok: { DEFAULT: token('ok'), soft: token('ok-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
        bad: { DEFAULT: token('bad'), soft: token('bad-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Onest', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        panel: '16px',
      },
      boxShadow: {
        hover: '0 1px 2px rgb(var(--c-shadow) / 0.06), 0 8px 24px -8px rgb(var(--c-shadow) / 0.18)',
        drawer: '-24px 0 48px -16px rgb(var(--c-shadow) / 0.35)',
        pop: '0 12px 32px -8px rgb(var(--c-shadow) / 0.28)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-accent) / 0.45)' },
          '100%': { boxShadow: '0 0 0 10px rgb(var(--c-accent) / 0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
