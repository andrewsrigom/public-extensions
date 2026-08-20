import { ProductFilterApp } from "../src/content/product-filter-app";
import { getProductPlatformAdapterForLocation } from "../src/platforms";

export default defineContentScript({
  matches: [
    "https://amazon.com.br/*",
    "https://www.amazon.com.br/*",
    "https://amazon.com/*",
    "https://www.amazon.com/*",
    "https://mercadolivre.com.br/*",
    "https://www.mercadolivre.com.br/*",
    "https://aliexpress.com/*",
    "https://www.aliexpress.com/*",
    "https://*.aliexpress.com/*",
    "https://temu.com/*",
    "https://www.temu.com/*",
    "https://*.temu.com/*"
  ],
  runAt: "document_idle",
  main() {
    const adapter = getProductPlatformAdapterForLocation(window.location);

    if (adapter) {
      void new ProductFilterApp(adapter).start();
    }
  }
});
