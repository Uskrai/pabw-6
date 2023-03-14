import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { dependencies } from "./package.json";

function buildRollupInput(isDevelopment: boolean) {
  const rollupInput: { [entryAlias: string]: string } = isDevelopment
    ? {
        "dev.tsx": path.resolve(__dirname, "./src/dev.tsx"),
      }
    : {};

  return rollupInput;
}

function renderChunks(deps: Record<string, string>) {
  let chunks = {};
  Object.keys(deps).forEach((key) => {
    if (
      [
        "react",
        "react-router-dom",
        "react-dom",
        "@mui/material",
        "@popperjs/core",
        "@mui/base",
        "@emotion/react",
        "@emotion/styled",
      ].includes(key)
    )
      return;
    chunks[key] = [key];
  });
  return chunks;
}

// https://vitejs.dev/config/
export default defineConfig(async ({}) => ({
  clearScreen: false,
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            "react",
            "react-router-dom",
            "react-dom",
            // "@mui/material",
            // "@popperjs/core",
            // "@mui/base",
            // "@emotion/react",
            // "@emotion/styled",
            // "dom-helpers",
          ],
          ...renderChunks(dependencies),
        },
      },
      //   input: buildRollupInput(command === "serve"),
    },
  },
  define: {
    // When this variable is set, setupDevelopment.tsx will also be loaded!
    // See `dev.tsx` which is included in development.
    "import.meta.env.DEV_SERVER_PORT": String(process.env.DEV_SERVER_PORT),
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        secure: false,
      },
    },
    // origin: "http://127.0.0.1:8080"
  },

  plugins: [react()],
}));
