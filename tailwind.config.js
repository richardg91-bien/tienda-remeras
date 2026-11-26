/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans:    ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"],
      },
      colors: {
        primary:    "#75D4E1",
        secondary:  "#9281D9",
        tertiary:   "#D9A2C0",
        background: "#FFFFFF",
        surface:    "#FFFFFF",
        surfaceHigh: "#F6F7FB",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 70% 45% at 50% -10%, rgba(117,212,225,0.18), transparent), radial-gradient(ellipse 40% 30% at 80% 30%, rgba(146,129,217,0.12), transparent)",
        "card-gradient":
          "linear-gradient(145deg, #FFFFFF 0%, #F6F7FB 100%)",
      },
      boxShadow: {
        "neon-cyan":    "0 4px 16px rgba(66,170,191,0.12)",
        "neon-cyan-sm": "0 2px 8px rgba(66,170,191,0.12)",
        "neon-purple":  "0 4px 16px rgba(125,103,198,0.10)",
        "neon-lime":    "0 4px 16px rgba(66,170,191,0.12)",
        "glass":        "0 4px 16px rgba(31,41,55,0.06)",
        "card-hover":   "0 8px 24px rgba(31,41,55,0.10)",
      },
      animation: {
        "fade-up":          "fadeUp 0.6s ease forwards",
        "fade-in":          "fadeIn 0.4s ease forwards",
        "glow-pulse-cyan":  "glowPulseCyan 3s ease-in-out infinite",
        "float":            "float 6s ease-in-out infinite",
        "shimmer":          "shimmer 2.5s linear infinite",
        "slide-in-right":   "slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "scan-line":        "scanLine 4s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        glowPulseCyan: {
          "0%, 100%": { boxShadow: "0 4px 14px rgba(66,170,191,0.10)" },
          "50%":       { boxShadow: "0 6px 20px rgba(125,103,198,0.16)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        scanLine: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(200%)" },
        },
      },
    },
  },
  plugins: [],
};
