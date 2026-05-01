import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "!./src/app/orchestrator/**",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/packages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        og: {
          purple: "#9200E1",
          accent: "#B75FFF",
          light: "#CB8AFF",
          lavender: "#DDC2FB",
          text: "#E3C1FF",
          dark: "#1A1A1F",
          "dark-hover": "#2A2A2F",
          surface: "rgba(30, 30, 35, 0.6)",
          "surface-hover": "rgba(40, 40, 45, 0.7)",
          border: "rgba(183, 95, 255, 0.15)",
          "border-hover": "rgba(183, 95, 255, 0.4)",
          "glow": "rgba(183, 95, 255, 0.15)",
          label: "#C0B8D0",
        },
      },
      borderRadius: {
        "og": "16px",
        "og-sm": "12px",
      },
      boxShadow: {
        "og-card": "0 2px 12px rgba(0, 0, 0, 0.3)",
        "og-card-hover": "0 8px 24px rgba(146, 0, 225, 0.2)",
        "og-btn": "0 4px 14px rgba(26, 26, 31, 0.25)",
        "og-btn-hover": "0 6px 20px rgba(26, 26, 31, 0.35)",
      },
      fontFamily: {
        sans: ["'Regola Pro'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Geist Mono'", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
