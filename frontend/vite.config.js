import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = path.resolve(__dirname, "../localhost+1-key.pem");
const certPath = path.resolve(__dirname, "../localhost+1.pem");

export default defineConfig(({ command }) => {
  const shouldUseLocalHttps =
    command === "serve" && fs.existsSync(keyPath) && fs.existsSync(certPath);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      ...(shouldUseLocalHttps
        ? {
            https: {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            },
          }
        : {}),
      host: true,
      port: 5173,
    },
  };
});
