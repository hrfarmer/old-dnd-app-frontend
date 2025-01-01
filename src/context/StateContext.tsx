import { listen } from "@tauri-apps/api/event";
import { load, Store } from "@tauri-apps/plugin-store";
import { open } from "@tauri-apps/plugin-shell";
import React, { createContext, useEffect, useState } from "react";
import { SessionType } from "../types/WsTypes";
import { generateAvatarUrl } from "../utils";

export type StateType = {
  session: SessionType | null;
  sessionCookie: SessionCookie;
  removeSession: (access_token: string) => void;
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
  const [store, setStore] = useState<Store | null>(null);
  const [tokenCookie, setTokenCookie] = useState<TokenCookie>([]);
  const [sessionCookie, setSessionCookie] = useState<SessionCookie>({});

  console.log(tokenCookie);
  console.log(sessionCookie);
  console.log(session);

  function setDefaultSession() {
    if (tokenCookie.length === 0) return;

    for (const t of tokenCookie) {
      if (t.active === true) {
        setSession(sessionCookie[t.access_token]);
        return;
      }
    }
  }

  async function removeSession(access_token: string) {
    for (const t of tokenCookie) {
      if (t.access_token === access_token) {
        const newTokenCookie = tokenCookie.splice(tokenCookie.indexOf(t), 1);
        const newSessionCookie = sessionCookie;
        delete newSessionCookie[t.access_token];

        setTokenCookie(newTokenCookie);
        setSessionCookie(newSessionCookie);
        await store!.set("token", newTokenCookie);
        await store!.set("session", newSessionCookie);
      }
    }
  }

  useEffect(() => {
    const init = async () => {
      const _store = await load("store.json");
      let t = await _store.get<TokenCookie | undefined>("token");
      let s = await _store.get<SessionCookie | undefined>("session");

      if (!t) {
        await _store.set("token", []);
        t = [];
      }

      if (!s) {
        await _store.set("session", {});
        s = {};
      }

      for (const a of t) {
        console.log("t: ", t);
        console.log(a);
        if (a.active === true) {
          console.log(`The session cookie: ${JSON.stringify(s)}`);
          console.log(`THE SESSION: ${s[a.access_token]}`);
          setSession(s[a.access_token]);
          break;
        }
      }

      setTokenCookie(t);
      setSessionCookie(s);
      setStore(_store);
    };

    init();
  }, []);

  // This is really just here for sake of the listen function not triggering twice
  // fml its still triggering twice for some reason
  listen<string>("open_login_url", (url) => {
    open(url.payload);
  });

  listen<string>("session", async (s) => {
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

    setTokenCookie(tokenCookie);
    // fix this being null for some reason
    await store!.set("token", tokenCookie);

    if (payload.session.avatar) {
      payload.session.avatar_url = generateAvatarUrl(payload.session);
    }

    sessionCookie[payload.access_token] = payload.session;
    setSessionCookie(sessionCookie);
    await store!.set("session", sessionCookie);

    setSession(payload.session);
  });

  return (
    <StateContext.Provider value={{ session, sessionCookie, removeSession }}>
      {children}
    </StateContext.Provider>
  );
}

export const StateContext = createContext<StateType | null>(null);
