/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // AI-Inspired Color Palette
        ai: {
          purple: '#8b5cf6',      // Primary AI Purple
          cyan: '#06b6d4',        // AI Cyan
          emerald: '#10b981',     // AI Emerald
          amber: '#f59e0b',       // AI Amber
          red: '#ef4444',         // AI Red
        },
        // Neutral Colors
        neutral: {
          background: '#f8fafc',  // Light gradient start
          'background-2': '#e2e8f0', // Light gradient middle
          'background-3': '#f1f5f9', // Light gradient end
          text: '#1f2937',        // Primary text (slate-800)
          'text-secondary': '#64748b', // Secondary text
          border: '#e2e8f0',      // Borders (slate-200)
        },
        // Glassmorphism Colors
        glass: {
          white: 'rgba(255, 255, 255, 0.8)',
          'white-90': 'rgba(255, 255, 255, 0.9)',
          'white-70': 'rgba(255, 255, 255, 0.7)',
          'white-50': 'rgba(255, 255, 255, 0.5)',
          'white-30': 'rgba(255, 255, 255, 0.3)',
        },
        // Status Colors
        status: {
          active: '#10b981',      // AI Emerald
          idle: '#f59e0b',        // AI Amber
          maintenance: '#ef4444', // AI Red
          completed: '#06b6d4',   // AI Cyan
          offline: '#64748b',     // Slate gray
        },
        // Legacy support
        light: {
          surface: '#f8fafc',
          'surface-2': '#ffffff',
          'surface-3': '#e2e8f0',
          'surface-4': '#f1f5f9',
          accent: '#8b5cf6',
          'accent-2': '#06b6d4',
          'accent-3': '#10b981',
          'accent-glow': '#8b5cf620',
          'accent-2-glow': '#06b6d420',
          'accent-3-glow': '#10b98120',
          muted: '#64748b',
          text: '#1f2937',
          'text-secondary': '#64748b',
          'text-tertiary': '#64748b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#06b6d4',
        },
        // Gradient colors
        gradient: {
          from: '#8b5cf6',
          via: '#06b6d4',
          to: '#10b981',
        },
        // Dark theme
        dark: {
          surface: '#0f172a',
          'surface-2': '#1e293b',
          'surface-3': '#334155',
          accent: '#8b5cf6',
          'accent-2': '#06b6d4',
          'accent-3': '#10b981',
          text: '#f8fafc',
          'text-secondary': '#cbd5e1',
          'text-tertiary': '#94a3b8',
        },
        // Override default shadcn colors for Gen-AI theme
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        // AI Glow Effects
        'ai-purple-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'ai-cyan-glow': '0 0 20px rgba(6, 182, 212, 0.3)',
        'ai-emerald-glow': '0 0 20px rgba(16, 185, 129, 0.3)',
        'ai-amber-glow': '0 0 20px rgba(245, 158, 11, 0.3)',
        'ai-red-glow': '0 0 20px rgba(239, 68, 68, 0.3)',
        // Glassmorphism Shadows
        'glass-card': '0 8px 32px rgba(31, 38, 135, 0.1)',
        'glass-card-hover': '0 12px 40px rgba(31, 38, 135, 0.15)',
        'glass-elevated': '0 16px 48px rgba(31, 38, 135, 0.2)',
        // Button Shadows
        'ai-button': '0 4px 14px rgba(139, 92, 246, 0.2)',
        'ai-button-hover': '0 6px 20px rgba(139, 92, 246, 0.3)',
        'ai-button-secondary': '0 2px 8px rgba(31, 38, 135, 0.1)',
        // Legacy support
        'light-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'light-glow-2': '0 0 20px rgba(6, 182, 212, 0.3)',
        'light-glow-3': '0 0 20px rgba(16, 185, 129, 0.3)',
        'light-card': '0 4px 12px rgba(15, 23, 42, 0.08)',
        'light-card-hover': '0 8px 25px rgba(15, 23, 42, 0.12)',
        'light-card-elevated': '0 10px 40px rgba(15, 23, 42, 0.1)',
        'light-button': '0 4px 14px rgba(139, 92, 246, 0.2)',
        'light-button-hover': '0 6px 20px rgba(139, 92, 246, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-ai-purple': 'pulseAIPurple 2s ease-in-out infinite',
        'pulse-ai-cyan': 'pulseAICyan 2s ease-in-out infinite',
        'pulse-ai-emerald': 'pulseAIEmerald 2s ease-in-out infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 199, 217, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(14, 199, 217, 0.5)' },
        },
        pulseAIPurple: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' },
        },
        pulseAICyan: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.5)' },
        },
        pulseAIEmerald: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)' },
        },
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        '70': '280px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};