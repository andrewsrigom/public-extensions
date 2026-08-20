import type { ProductFilterSettings } from "./types";

export const MESSAGE_GET_STATE = "HUP_GET_STATE";
export const MESSAGE_UPDATE_SETTINGS = "HUP_UPDATE_SETTINGS";
export const MESSAGE_ADD_ASIN = "HUP_ADD_ASIN";
export const MESSAGE_ADD_PRODUCT_ID = "HUP_ADD_PRODUCT_ID";
export const MESSAGE_ADD_TERM = "HUP_ADD_TERM";
export const MESSAGE_RESCAN = "HUP_RESCAN";

export type ProductFilterMessage =
  | { type: typeof MESSAGE_GET_STATE }
  | { type: typeof MESSAGE_UPDATE_SETTINGS; settings: Partial<ProductFilterSettings> }
  | { type: typeof MESSAGE_ADD_ASIN; asin: string }
  | { type: typeof MESSAGE_ADD_PRODUCT_ID; productId: string }
  | { type: typeof MESSAGE_ADD_TERM; term: string }
  | { type: typeof MESSAGE_RESCAN };

export function isProductFilterMessage(message: unknown): message is ProductFilterMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof (message as { type?: unknown }).type === "string" &&
    [
      MESSAGE_GET_STATE,
      MESSAGE_UPDATE_SETTINGS,
      MESSAGE_ADD_ASIN,
      MESSAGE_ADD_PRODUCT_ID,
      MESSAGE_ADD_TERM,
      MESSAGE_RESCAN
    ].includes((message as { type: string }).type)
  );
}
