import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const uiPkg = path.resolve(__dirname, "../../packages/chatbot-ui");
const corePkg = path.resolve(__dirname, "../../packages/chatbot-core");
const kitPkg = path.resolve(__dirname, "../../packages/chatbot-service-kit");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // CSS 경로 (구체적인 것부터)
      { find: "@company/chatbot-ui/styles.css", replacement: path.join(uiPkg, "src/styles/chatbot.css") },
      // 패키지 소스 직접 참조
      { find: "@company/chatbot-ui", replacement: path.join(uiPkg, "src") },
      { find: "@company/chatbot-core", replacement: path.join(corePkg, "src") },
      { find: "@company/chatbot-service-kit", replacement: path.join(kitPkg, "src") },
    ],
  },
});
