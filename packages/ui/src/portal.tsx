import { createContext, type ReactNode, useContext } from "react";

const ExtensionPortalContainerContext = createContext<HTMLElement | undefined>(undefined);

export function ExtensionPortalProvider({ children, container }: { children: ReactNode; container?: HTMLElement }) {
  return (
    <ExtensionPortalContainerContext.Provider value={container}>{children}</ExtensionPortalContainerContext.Provider>
  );
}

export function useExtensionPortalContainer(): HTMLElement | undefined {
  return useContext(ExtensionPortalContainerContext);
}
