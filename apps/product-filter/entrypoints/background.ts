import { browser } from "wxt/browser";

import { applySettingsMutation, isSettingsMutationMessage } from "../src/core/storage";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isSettingsMutationMessage(message)) return undefined;

    void applySettingsMutation(message.mutation)
      .then(sendResponse)
      .catch(() => sendResponse(undefined));
    return true;
  });
});
