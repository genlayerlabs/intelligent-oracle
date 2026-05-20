import localFont from "next/font/local";

export const switzer = localFont({
  src: [
    { path: "../fonts/switzer/Switzer-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/switzer/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/switzer/Switzer-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/switzer/Switzer-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/switzer/Switzer-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-switzer",
  display: "swap",
  fallback: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
});
