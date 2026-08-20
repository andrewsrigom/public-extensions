import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Quick Notes",
    description: "Keep quick notes for the current site or every page.",
    minimum_chrome_version: "114",
    permissions: ["storage", "tabs"],
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    },
    action: {
      default_title: "Quick Notes",
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
