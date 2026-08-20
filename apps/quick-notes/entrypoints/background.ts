import { browser } from "wxt/browser";
import { applyNoteMutation, isNoteMutationMessage, isNoteReadMessage, loadNotes } from "../src/notes/storage";

type SidePanelApi = {
  setPanelBehavior?: (behavior: { openPanelOnActionClick: boolean }) => Promise<void>;
};

declare const chrome: {
  sidePanel?: SidePanelApi;
};

export default defineBackground(() => {
  const sidePanel = chrome.sidePanel;

  if (sidePanel?.setPanelBehavior) {
    void sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
  }

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const operation = isNoteMutationMessage(message)
      ? applyNoteMutation(message.mutation)
      : isNoteReadMessage(message)
        ? loadNotes()
        : null;

    if (!operation) return undefined;

    void operation.then(sendResponse).catch(() => sendResponse(undefined));
    return true;
  });
});
