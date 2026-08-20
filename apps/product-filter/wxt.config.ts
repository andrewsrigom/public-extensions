import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Hide Unwanted Products",
    description: "Hide marketplace product cards by blocked terms.",
    permissions: ["storage", "activeTab"],
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    },
    action: {
      default_title: "Hide Unwanted Products",
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
        48: "icons/icon-48.png",
        128: "icons/icon-128.png"
      }
    }
  },
  outDir: ".output",
  vite: () => ({
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react"
    },
    plugins: [tailwindcss()]
  })
});
