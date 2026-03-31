import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/chatbot-ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "chat-slide-in": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "message-appear": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "dot-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "chat-slide-in":
          "chat-slide-in 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "message-appear":
          "message-appear 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "cursor-blink": "cursor-blink 600ms step-end infinite",
        "dot-bounce": "dot-bounce 600ms ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
