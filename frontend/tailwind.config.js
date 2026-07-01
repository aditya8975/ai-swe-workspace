/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0D1117",
          panel: "#161B22",
          elevated: "#1C2128",
          hover: "#21262D",
        },
        border: {
          DEFAULT: "#21262D",
          subtle: "#30363D",
        },
        text: {
          primary: "#E6EDF3",
          secondary: "#9198A1",
          muted: "#6E7681",
        },
        accent: {
          DEFAULT: "#E3A33A",
          hover: "#F0B454",
          dim: "#8A6526",
        },
        success: "#3FB950",
        danger: "#F85149",
        info: "#58A6FF",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-cursor": "pulse-cursor 1s ease-in-out infinite",
      },
      keyframes: {
        "pulse-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};
