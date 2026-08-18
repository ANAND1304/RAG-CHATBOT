/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
      colors: {
        surface: {
          50:  "#f8f9fc",
          100: "#f0f2f8",
          200: "#e4e7f0",
          600: "#3a3d4e",
          700: "#2a2d3e",
          800: "#1a1d2e",
          850: "#151827",
          900: "#0f1120",
          950: "#090b14",
        },
        accent: {
          DEFAULT: "#6c8ef5",
          dim:    "#4a6ef0",
          glow:   "#8aaaf8",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
        },
      },
      animation: {
        "fade-in":      "fadeIn 0.3s ease-out",
        "slide-up":     "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
        "pulse-slow":   "pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
        "typing":       "typing 1.2s steps(3) infinite",
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        typing:   { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.2 } },
      },
    },
  },
  plugins: [],
};
