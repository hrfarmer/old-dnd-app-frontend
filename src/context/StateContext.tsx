import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import React, { createContext, useEffect, useState } from "react";
import { ChatMessageType, SessionType } from "../types/WsTypes";
import { generateAvatarUrl } from "../utils";

type Session = {
  access_token: string;
  refresh_token: string;
  session: SessionType;
};

export type StateType = {
  session: Session | null;
  connectedUsers: [string, SessionType][];
  messages: ChatMessageType[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
};

export function StateContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<[string, SessionType][]>(
    []
  );
  const [messages, setMessages] = useState<ChatMessageType[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      invoke<string>("get_session", { token: token })
        .then((session) => {
          const s = JSON.parse(session) as Session;
          if (s.session.avatar) {
            s.session.avatar_url = generateAvatarUrl(s.session);
          }

          setSession(s);
        })
        .catch((err) => console.log(err));
    }
  }, []);

  // This is really just here for sake of the listen function not triggering twice
  // fml its still triggering twice for some reason
  listen<string>("open_login_url", (url) => {
    open(url.payload);
  });

  listen<string>("session", (s) => {
    const payload = JSON.parse(s.payload) as Session;
    localStorage.setItem("token", payload.access_token);

    if (payload.session.avatar) {
      payload.session.avatar_url = generateAvatarUrl(payload.session);
    }

    setSession(payload);
  });

  listen<ChatMessageType>("message", (msg) => {
    setMessages((msgs) => [msg.payload, ...msgs]);
  });

  listen<{ [key: string]: SessionType }>("connected_users", (users) => {
    setConnectedUsers(Object.entries(users.payload));
  });

  return (
    <StateContext.Provider
      value={{ session, connectedUsers, messages, setMessages }}
    >
      {children}
    </StateContext.Provider>
  );
}

export const StateContext = createContext<StateType | null>(null);
