import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Site Reset",
    description: "Reset cookies, cache, and local site data for the current website.",
    permissions: ["browsingData", "cookies", "scripting", "storage", "tabs"],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    },
    action: {
      default_title: "Site Reset",
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
