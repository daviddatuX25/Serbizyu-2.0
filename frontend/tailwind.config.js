/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        forest: { 50: "#ecf8f4", 100: "#d1efe5", 200: "#a7dfce", 300: "#6fc7b1", 400: "#3aa88f", 500: "#17866f", 600: "#0d715f", 700: "#0b5a4d", 800: "#0c483f", 900: "#0b3b35", 950: "#052420" },
        ink: { 50: "#f4f7f5", 100: "#e6ece8", 200: "#ced9d3", 300: "#a9bbb1", 400: "#7c9588", 500: "#5d786b", 600: "#485f55", 700: "#3b4d46", 800: "#303f39", 900: "#26332e", 950: "#14211d" },
        cream: { 50: "#fdfcf9", 100: "#f8f5ed", 200: "#efe9dc", 300: "#e2d6c4" },
        mango: { 50: "#fff8e6", 100: "#ffedb8", 200: "#ffdb72", 300: "#f9c64b", 400: "#eda824", 500: "#d98a12", 600: "#b9650d", 700: "#95490f" },
        coral: { 50: "#fff2ee", 100: "#ffe1d8", 200: "#ffc0ae", 300: "#f89477", 400: "#ed6e4e", 500: "#d94e30", 600: "#b63a22" },
      },
      boxShadow: {
        soft: "0 16px 44px -28px rgba(20, 33, 29, .34)",
        lift: "0 22px 60px -30px rgba(13, 113, 95, .38)",
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem" },
    },
  },
  plugins: [],
};
