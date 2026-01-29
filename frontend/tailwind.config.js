/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette - Deep ocean blues
        'blob-bg': '#0a0e17',
        'blob-surface': '#111827',
        'blob-card': '#1a2332',
        'blob-border': '#2a3a4d',
        
        // Accent colors
        'blob-primary': '#06b6d4',
        'blob-secondary': '#3b82f6',
        'blob-accent': '#10b981',
        'blob-warning': '#f59e0b',
        'blob-danger': '#ef4444',
        
        // Node type colors
        'node-individual': '#06b6d4',
        'node-blob': '#8b5cf6',
        'node-aggregated': '#f59e0b',
        'node-project': '#10b981',
        'node-skill': '#ec4899',
        
        // Text colors
        'blob-text': '#f1f5f9',
        'blob-text-muted': '#94a3b8',
        'blob-text-dim': '#64748b',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.3)',
        'glow-md': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-lg': '0 0 30px rgba(6, 182, 212, 0.5)',
      },
    },
  },
  plugins: [],
}
