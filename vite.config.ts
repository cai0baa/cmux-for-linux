import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const host = env.TAURI_DEV_HOST;
  const isCmuxVariant = env.VITE_UI_VARIANT === "cmux";

  return {
    plugins: [react()],
    clearScreen: false,
    build: {
      outDir: env.VITE_OUT_DIR || (mode === "production" && isCmuxVariant ? "dist-cmux-ui" : "dist"),
    },
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
