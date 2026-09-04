import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#111C4E",
        brand: {
          navy: "#111C4E",
          blue: "#2F6BFF",
          yellow: "#FFC530",
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
