import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: "rgba(19, 17, 31, 0.20)",
      },
      fontFamily: {
        lexend: ["Lexend", "sans-serif"],
        "work-sans": ["Work Sans", "sans-serif"],
      },
      screens: {
        mobileXs: "500px",
      },
    },
  },
  plugins: [],
};
export default config;
