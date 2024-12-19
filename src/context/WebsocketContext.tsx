import React, { createContext, useState } from "react";

type WebsocketState = {
  connected: boolean;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
};

export function WebsocketContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [connected, setConnected] = useState<boolean>(false);

  return (
    <WebsocketContext.Provider value={{ connected, setConnected }}>
      {children}
    </WebsocketContext.Provider>
  );
}

export const WebsocketContext = createContext<WebsocketState | null>(null);
