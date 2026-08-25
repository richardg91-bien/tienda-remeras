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
        // Paleta NEON-STITCH
        primary:    "#00f2ff", // Cian neón
        secondary:  "#ecb2ff", // Púrpura neón
        tertiary:   "#bdec00", // Lima neón
        background: "#0A0A0B",
        surface:    "#131314",
        surfaceHigh: "#1a1a1c",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 70% 45% at 50% -10%, rgba(0,242,255,0.12), transparent), radial-gradient(ellipse 40% 30% at 80% 30%, rgba(236,178,255,0.07), transparent)",
        "card-gradient":
          "linear-gradient(145deg, rgba(22,22,24,0.8) 0%, rgba(10,10,11,0.9) 100%)",
      },
      boxShadow: {
        "neon-cyan":    "0 0 20px rgba(0,242,255,0.35), 0 0 60px rgba(0,242,255,0.10)",
        "neon-cyan-sm": "0 0 10px rgba(0,242,255,0.25)",
        "neon-purple":  "0 0 20px rgba(236,178,255,0.30)",
        "neon-lime":    "0 0 20px rgba(189,236,0,0.30)",
        "glass":        "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-hover":   "0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(0,242,255,0.12)",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,242,255,0.25)" },
          "50%":       { boxShadow: "0 0 50px rgba(0,242,255,0.55), 0 0 100px rgba(0,242,255,0.15)" },
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
