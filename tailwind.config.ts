import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#1e4fd8",
          600: "#1a3fb0",
          700: "#152f85",
          900: "#0d1c4d"
        }
      }
    }
  },
  plugins: []
};

export default config;
