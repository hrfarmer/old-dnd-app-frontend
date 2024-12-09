import { listen } from "@tauri-apps/api/event";
import React, { createContext, useState } from "react";
import { SessionType } from "../types/WsTypes";
import { generateAvatarUrl } from "../utils";

export type StateType = {
  session: SessionType | null;
  connectedUsers: [string, SessionType][];
};

export function StateContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SessionType | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<[string, SessionType][]>(
    []
  );

  listen<SessionType>("session", (session) => {
    let image_url = "";
    if (session.payload.avatar) {
      image_url = generateAvatarUrl(session.payload);
    }
    setSession({
      ...session.payload,
      avatar_url: image_url,
    });
  });

  listen<{ [key: string]: SessionType }>("connected_users", (users) => {
    setConnectedUsers(Object.entries(users.payload));
  });

  return (
    <StateContext.Provider value={{ session, connectedUsers }}>
      {children}
    </StateContext.Provider>
  );
}

export const StateContext = createContext<StateType | null>(null);
