import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sonicBlueMain: "#0057E7",
        sonicBlueDark: "#002A7A",
        sonicBlueNavy: "#001A55",
        sonicYellow: "#FFD500",
        sonicGold: "#FFB800",
        sonicRed: "#E5170A",
        sonicCyan: "#25BDEC",
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        'solid-3d': '0 6px 0 rgba(0, 0, 0, 0.4)',
        'solid-3d-cyan': '0 6px 0 #0057E7',
        'glow-gold': '0 0 15px rgba(255, 184, 0, 0.6)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
