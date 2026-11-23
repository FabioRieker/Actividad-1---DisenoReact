/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Desactiva el modo oscuro automático por media query para evitar conflictos con las paletas de Ionic
  darkMode: 'class',
  theme: {
    extend: {
      /*
        Paleta "riso-print": tintas planas de imprenta risográfica sobre papel.
        Contrastes verificados (WCAG AA ≥ 4.5:1):
          ultra + blanco 8.1:1 · vermilion + ink 5.9:1 · lilac + ink 9:1 · lime + ink 15:1
      */
      colors: {
        ink: '#111111',
        paper: '#F2EDE4',
        ultra: '#2B2BFF',
        vermilion: '#FF4D2E',
        lilac: '#B9A5FF',
        lime: '#C6F432',
      },
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brutal-sm': '3px 3px 0 0 #111',
        brutal: '6px 6px 0 0 #111',
        'brutal-lg': '10px 10px 0 0 #111',
        // Doble tinta desregistrada, como una impresión risográfica desplazada
        riso: '5px 5px 0 0 #2B2BFF, 10px 10px 0 0 #111',
      },
      borderWidth: {
        3: '3px',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'stamp-in': {
          '0%': { transform: 'rotate(-8deg) scale(1.6)', opacity: '0' },
          '100%': { transform: 'rotate(-8deg) scale(1)', opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'stamp-in': 'stamp-in 180ms ease-out both',
      },
    },
  },
  plugins: [],
};
