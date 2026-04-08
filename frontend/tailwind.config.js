/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#38b6ff",
        secondary: "#f5b820",
      },
    },
  },
  plugins: [],
};
