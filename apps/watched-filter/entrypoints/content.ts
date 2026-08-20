import { ContentApp } from "../src/content/content-app";
import { getAdapterForLocation } from "../src/platforms";

export default defineContentScript({
  matches: [
    "https://primevideo.com/*",
    "https://www.primevideo.com/*",
    "https://*.primevideo.com/*",
    "https://netflix.com/*",
    "https://www.netflix.com/*",
    "https://*.netflix.com/*",
    "https://disneyplus.com/*",
    "https://www.disneyplus.com/*",
    "https://*.disneyplus.com/*",
    "https://max.com/*",
    "https://www.max.com/*",
    "https://*.max.com/*",
    "https://hbomax.com/*",
    "https://www.hbomax.com/*",
    "https://*.hbomax.com/*",
    "https://youtube.com/*",
    "https://www.youtube.com/*",
    "https://*.youtube.com/*",
    "https://youtu.be/*",
    "https://www.youtu.be/*",
    "https://globoplay.globo.com/*",
    "https://*.globoplay.globo.com/*",
    "https://paramountplus.com/*",
    "https://www.paramountplus.com/*",
    "https://*.paramountplus.com/*",
    "https://tv.apple.com/*",
    "https://*.tv.apple.com/*",
    "https://crunchyroll.com/*",
    "https://www.crunchyroll.com/*",
    "https://*.crunchyroll.com/*",
    "https://iq.com/*",
    "https://www.iq.com/*",
    "https://*.iq.com/*"
  ],
  runAt: "document_idle",
  main() {
    const adapter = getAdapterForLocation(window.location);

    if (adapter) {
      void new ContentApp(adapter).start();
    }
  }
});
