import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { open } from "@tauri-apps/plugin-shell";
import React, { createContext, useEffect, useState } from "react";
import { SessionType } from "../types/WsTypes";
import { generateAvatarUrl } from "../utils";

export type StateType = {
  session: SessionType | null;
  sessionCookie: SessionCookie;
  access_token: string;
  removeSession: (access_token: string) => Promise<void>;
};

type SessionResponse = {
  access_token: string;
  refresh_token: string;
  session: SessionType;
};

export type TokenCookie = {
  access_token: string;
  refresh_token: string;
  active: boolean;
}[];

export type SessionCookie = { [key: string]: SessionType };

export function StateContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SessionType | null>(null);
  const [tokenCookie, setTokenCookie] = useState<TokenCookie>([]);
  const [sessionCookie, setSessionCookie] = useState<SessionCookie>({});
  const [access_token, setAccessToken] = useState<string>("");

  async function removeSession(access_token: string) {
    const store = await load("store.json");

    for (const t of tokenCookie) {
      if (t.access_token === access_token) {
        const newTokenCookie = tokenCookie.splice(tokenCookie.indexOf(t), 1);
        const newSessionCookie = sessionCookie;
        delete newSessionCookie[t.access_token];

        setTokenCookie(newTokenCookie);
        setSessionCookie(newSessionCookie);
        setAccessToken("");
        await store.set("token", newTokenCookie);
        await store.set("session", newSessionCookie);
      }
    }
  }

  useEffect(() => {
    const urlListener = listen<string>("open_login_url", (url) => {
      open(url.payload);
    });

    const sessionListener = listen<string>("session", async (s) => {
      const store = await load("store.json");

      if (session) {
        tokenCookie.find((t) => t.active === true)!.active = false;
      }

      const payload = JSON.parse(s.payload) as SessionResponse;

      let sessionFound = false;
      for (const key in sessionCookie) {
        if (sessionCookie[key].id === payload.session.id) {
          sessionFound = true;
          const token = tokenCookie.find((t) => t.access_token === key)!;

          token.access_token = payload.access_token;
          token.refresh_token = payload.refresh_token;
          token.active = true;
        }
      }

      if (!sessionFound) {
        tokenCookie.push({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
          active: true,
        });
      }

      setAccessToken(payload.access_token);
      setTokenCookie(tokenCookie);
      await store.set("token", tokenCookie);

      if (payload.session.avatar) {
        payload.session.avatar_url = generateAvatarUrl(payload.session);
      }

      sessionCookie[payload.access_token] = payload.session;
      setSessionCookie(sessionCookie);
      await store.set("session", sessionCookie);

      setSession(payload.session);
    });

    const init = async () => {
      const store = await load("store.json");
      let t = await store.get<TokenCookie | undefined>("token");
      let s = await store.get<SessionCookie | undefined>("session");

      if (!t) {
        await store.set("token", []);
        t = [];
      }

      if (!s) {
        await store.set("session", {});
        s = {};
      }

      for (const a of t) {
        if (a.active === true) {
          setSession(s[a.access_token]);
          break;
        }
      }

      setTokenCookie(t);
      setSessionCookie(s);
    };

    init();

    return () => {
      sessionListener.then((f) => f());
      urlListener.then((f) => f());
    };
  }, []);

  return (
    <StateContext.Provider
      value={{ session, sessionCookie, access_token, removeSession }}
    >
      {children}
    </StateContext.Provider>
  );
}

export const StateContext = createContext<StateType | null>(null);
