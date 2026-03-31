import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "fs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ["react", "react-dom"],
  onSuccess: async () => {
    mkdirSync("dist/styles", { recursive: true });
    copyFileSync("src/styles/chatbot.css", "dist/styles/chatbot.css");
    copyFileSync("src/styles/tokens.css", "dist/styles/tokens.css");
  },
});
