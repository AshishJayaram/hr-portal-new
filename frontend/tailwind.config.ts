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
      },
    },
  },
  plugins: [],
};
export default config;
