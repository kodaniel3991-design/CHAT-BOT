import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./index.html",
    // chatbot-ui 컴포넌트의 Tailwind 클래스도 스캔
    "../../packages/chatbot-ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
} satisfies Config;
