import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "PathSwitch",
    description: "Redirect sites automatically to the version or page you prefer.",
    permissions: ["storage", "webNavigation"],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    },
    action: {
      default_title: "PathSwitch",
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
