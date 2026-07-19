/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Glassmorphism Palette
        nexus_bg: "#09090b",
        nexus_card: "rgba(20, 20, 23, 0.6)",
        nexus_border: "rgba(255, 255, 255, 0.08)",
        nexus_accent: "#3b82f6",
        nexus_text: "#e4e4e7",
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}