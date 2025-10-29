import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: colors.gray,
        slate: colors.slate,
        indigo: colors.indigo,
        pink: colors.pink,
        purple: colors.purple,
        cyan: colors.cyan,
        yellow: colors.yellow,
        green: colors.green,
        orange: colors.orange,
        // Liquid Glass Theme Colors
        liquid: {
          primary: {
            purple: '#6366F1', // Indigo-500
            'purple-light': '#8B5CF6', // Violet-500
            'purple-dark': '#4F46E5', // Indigo-600
          },
          secondary: {
            orange: '#F59E0B', // Amber-500
            'orange-light': '#FBBF24', // Amber-400
            'orange-dark': '#D97706', // Amber-600
          },
          accent: {
            blue: '#3B82F6', // Blue-500
            green: '#10B981', // Emerald-500
            red: '#EF4444', // Red-500
            pink: '#EC4899', // Pink-500
            cyan: '#06B6D4', // Cyan-500
          },
          glass: {
            white: 'rgba(255, 255, 255, 0.15)',
            black: 'rgba(0, 0, 0, 0.15)',
            purple: 'rgba(99, 102, 241, 0.15)',
            blue: 'rgba(59, 130, 246, 0.15)',
          },
        },
      },
      backgroundImage: {
        'liquid-primary': 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        'liquid-secondary': 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
        'liquid-accent': 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
        'liquid-dark-primary': 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        'liquid-dark-secondary': 'linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      borderRadius: {
        'liquid-sm': '12px',
        'liquid-md': '16px',
        'liquid-lg': '24px',
        'liquid-xl': '32px',
      },
      boxShadow: {
        'liquid': '0 8px 20px rgba(0, 0, 0, 0.1), 0 16px 40px rgba(0, 0, 0, 0.06)',
        'liquid-dark': '0 8px 20px rgba(0, 0, 0, 0.26), 0 16px 40px rgba(0, 0, 0, 0.16)',
        'liquid-glass': '0 8px 20px rgba(0, 0, 0, 0.1), 0 16px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;
