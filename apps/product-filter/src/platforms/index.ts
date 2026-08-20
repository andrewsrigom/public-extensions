import type { ProductPlatformAdapter } from "../shared/types";
import { aliexpressAdapter } from "./aliexpress";
import { amazonAdapter } from "./amazon";
import { mercadoLivreAdapter } from "./mercado-livre";
import { temuAdapter } from "./temu";

export const PRODUCT_PLATFORM_ADAPTERS: ProductPlatformAdapter[] = [
  amazonAdapter,
  mercadoLivreAdapter,
  aliexpressAdapter,
  temuAdapter
];

export function getProductPlatformAdapterForLocation(location: Location): ProductPlatformAdapter | null {
  return getProductPlatformAdapterForUrl(location.href);
}

export function getProductPlatformAdapterForUrl(url: string): ProductPlatformAdapter | null {
  try {
    const parsedUrl = new URL(url);
    return PRODUCT_PLATFORM_ADAPTERS.find((adapter) => adapter.matches(parsedUrl)) || null;
  } catch (_error) {
    return null;
  }
}
