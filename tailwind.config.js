/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Background colors
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1c1c1c',
        },
        // Surface colors (elevated)
        surface: {
          DEFAULT: '#1c1c1c',
          elevated: '#242424',
          highlight: '#2a2a2a',
        },
        // Accent colors - vibrant purple/blue gradient
        accent: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
          blue: '#3b82f6',
        },
        // Text colors
        text: {
          primary: 'rgba(255, 255, 255, 1)',
          secondary: 'rgba(255, 255, 255, 0.7)',
          tertiary: 'rgba(255, 255, 255, 0.5)',
          muted: 'rgba(255, 255, 255, 0.3)',
        },
        // Status colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
    },
  },
  plugins: [],
};
