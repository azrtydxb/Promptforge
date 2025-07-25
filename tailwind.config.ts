import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import lineClamp from "@tailwindcss/line-clamp";

const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#E6F7FF',
          100: '#BAE7FF',
          200: '#91D5FF',
          300: '#69C0FF',
          400: '#40A9FF',
          500: '#007DB8', // Dell Blue
          600: '#0064A3',
          700: '#004B8A',
          800: '#003970',
          900: '#002756',
        },
        // Dell Design System Colors
        'dell-blue': {
          50: '#E6F7FF',
          100: '#BAE7FF',
          200: '#91D5FF',
          300: '#69C0FF',
          400: '#40A9FF',
          500: '#007DB8', // Primary Dell Blue
          600: '#0064A3',
          700: '#004B8A',
          800: '#003970',
          900: '#002756',
        },
        'dell-gray': {
          50: '#F8F9FA',
          100: '#F0F2F4',
          200: '#E8EAED',
          300: '#DDE1E5',
          400: '#C4C9CE',
          500: '#9BA1A6',
          600: '#6B7280',
          700: '#4B5563',
          800: '#374151',
          900: '#1A1E23',
        },
        'dell-accent': {
          blue: '#0F8CE6',
          teal: '#17A2B8',
          green: '#28A745',
          yellow: '#FFC107',
          red: '#DC3545',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Modern color palette
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // Dell Blue as primary blue
        blue: {
          50: '#E6F7FF',
          100: '#BAE7FF',
          200: '#91D5FF',
          300: '#69C0FF',
          400: '#40A9FF',
          500: '#007DB8', // Dell Blue
          600: '#0064A3',
          700: '#004B8A',
          800: '#003970',
          900: '#002756',
        },
        orange: {
          50: '#E6F7FF', // Dell Blue 50 (override orange with Dell blue)
          100: '#BAE7FF', // Dell Blue 100
          200: '#91D5FF', // Dell Blue 200
          300: '#69C0FF', // Dell Blue 300
          400: '#40A9FF', // Dell Blue 400
          500: '#007DB8', // Dell Blue 500
          600: '#0064A3', // Dell Blue 600
          700: '#004B8A', // Dell Blue 700
          800: '#003970', // Dell Blue 800
          900: '#002756', // Dell Blue 900
        },
        // Dell Technologies Color Palette
        dell: {
          blue: {
            50: '#E6F7FF',
            100: '#BAE7FF',
            200: '#91D5FF',
            300: '#69C0FF',
            400: '#40A9FF',
            500: '#007DB8', // Primary Dell Blue
            600: '#0064A3',
            700: '#004B8A',
            800: '#003970',
            900: '#002756',
          },
          gray: {
            50: '#F8F9FA',
            100: '#F0F2F4',
            200: '#E8EAED',
            300: '#DDE1E5',
            400: '#C4C9CE',
            500: '#9BA1A6',
            600: '#6B7280',
            700: '#4B5563',
            800: '#374151',
            900: '#1A1E23',
          },
          accent: {
            blue: '#0F8CE6',
            teal: '#17A2B8',
            green: '#28A745',
            yellow: '#FFC107',
            red: '#DC3545',
          }
        },
        purple: {
          50: '#F3F0FF',
          100: '#E9E5FF',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        pink: {
          500: '#EC4899',
          600: '#DB2777',
        },
      },
      borderColor: {
        primary: "hsl(var(--primary))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Dell Design System Extensions
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate, lineClamp],
};

export default config;