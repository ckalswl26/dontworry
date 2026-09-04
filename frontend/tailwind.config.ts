import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#111C4E",
        brand: {
          navy: "#111C4E",
          blue: "#0868F7",
          gold: "#F9B515",
          yellow: "#F9B515",
          "accent-green": "#18BFA0",
          "accent-purple": "#8B4DE8",
          sky: "#EAF6FF",
          cream: "#FFF8E7",
          red: "#F0453A",
          gray: "#F5F6FA",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
