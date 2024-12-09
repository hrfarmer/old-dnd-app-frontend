import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useState,
} from "react";
import { SessionType } from "../types/WsTypes";
import { listen } from "@tauri-apps/api/event";

export function SessionContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SessionType | null>(null);
  listen<SessionType>("session", (session) => {
    let image_url = "";
    if (session.payload.avatar) {
      image_url = `https://cdn.discordapp.com/avatars/${session.payload.id}/${session.payload.avatar}`;
    }
    setSession({
      ...session.payload,
      avatar_url: image_url,
    });
  });

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export const SessionContext = createContext<SessionType | null>(null);
