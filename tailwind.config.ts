import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background palette — layered depth
        'bg-base': '#0D0B1A',
        'bg-sidebar': '#0F0D1F',
        'bg-card': 'rgba(26,23,48,0.8)',
        'bg-card-solid': '#1A1730',
        'bg-elevated': '#252240',
        'bg-hover': '#2E2B4A',
        'bg-active': '#3D375E',

        // Accent brand palette (orange)
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          glow: 'rgba(249,115,22,0.15)',
        },

        // Primary alias
        primary: '#f97316',

        // Accent colors
        orange: {
          400: '#fb923c',
          500: '#f97316',
        },
        amber: {
          400: '#FBBF24',
        },

        // Text colors
        'text-primary': '#fafafa',
        'text-secondary': '#A5A1C2',
        'text-muted': '#71717a',
        'text-accent': '#f97316',

        // Border colors
        'border-default': 'rgba(46,43,74,0.6)',
        'border-hover': 'rgba(249,115,22,0.5)',
        'border-active': '#f97316',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        'status-pulse': 'status-pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'count-up': 'count-up 0.6s ease-out',
        'egg-wobble': 'egg-wobble 0.5s ease-in-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-x': 'gradient-x 4s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        'status-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'egg-wobble': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.12), transparent)',
        'dot-grid':
          'radial-gradient(circle, rgba(249,115,22,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
