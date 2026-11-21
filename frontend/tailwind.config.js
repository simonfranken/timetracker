/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm paper background and neutral ink
        paper: {
          DEFAULT: "#F6F5F1",
          sunken: "#FBFAF7",
          hover: "#ECEAE3",
          line: "#E7E4DA",
          soft: "#EFEDE5",
          edge: "#D8D4C8",
        },
        ink: {
          DEFAULT: "#1B1D1F",
          soft: "#4A4F55",
          muted: "#5E636A",
        },
        // Brand teal
        primary: {
          50: "#F0F8F6",
          100: "#E3F0EC",
          200: "#D6EBE6",
          300: "#BFE0D8",
          400: "#9CCDC2",
          500: "#0B6E5F",
          600: "#0B6E5F",
          700: "#095A4E",
          800: "#0B5F52",
          900: "#0A4B41",
        },
        danger: {
          DEFAULT: "#B42318",
          soft: "#FDECEA",
          ink: "#912018",
          line: "#F2C4BD",
          wash: "#FFF8F6",
        },
        // Balance corrections (hours added/removed on a target)
        correction: {
          DEFAULT: "#1F3F7A",
          soft: "#EEF3FB",
          edge: "#6E8FC9",
        },
      },
    },
  },
  plugins: [],
}
