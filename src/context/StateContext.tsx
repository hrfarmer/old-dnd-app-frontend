import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { load } from "@tauri-apps/plugin-store";
import React, { createContext, useEffect, useState } from "react";
import { SessionType } from "../types/WsTypes";
import { generateAvatarUrl } from "../utils";

export type StateType = {
  session: SessionType | null;
  sessionCookie: SessionCookie;
  tokenCookie: TokenCookie;
  access_token: string;
  removeSession: (access_token: string) => Promise<void>;
  loginToSession: (access_token: string) => Promise<void>;
  switchSessions: () => Promise<void>;
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

  async function loginToSession(access_token: string) {
    const store = await load("store.json");
    const tokenCookie = (await store.get<TokenCookie>("token")) as TokenCookie;
    const sessionCookie = (await store.get<SessionCookie>(
      "session",
    )) as SessionCookie;

    let token;

    for (const t of tokenCookie) {
      if (t.access_token === access_token) {
        t.active = true;
        token = t;
      } else {
        t.active = false;
      }
    }

    if (!token) {
      return;
    }

    await store.set("token", tokenCookie);
    await store.save();

    setTokenCookie(tokenCookie);
    setAccessToken(token.access_token);
    setSession(sessionCookie[token.access_token]);
  }

  async function switchSessions() {
    const store = await load("store.json");
    const tokenCookie = (await store.get<TokenCookie>("token")) as TokenCookie;

    for (const t of tokenCookie) {
      t.active = false;
    }

    await store.set("token", tokenCookie);
    await store.save();

    setSession(null);
    setAccessToken("");
  }

  async function removeSession(access_token: string) {
    const store = await load("store.json");
    const tokenCookie = (await store.get<TokenCookie>("token")) as TokenCookie;
    const sessionCookie = (await store.get<SessionCookie>(
      "session",
    )) as SessionCookie;

    for (const t of tokenCookie) {
      console.log(`t token: ${t.access_token} passed in: ${access_token}`);
      if (t.access_token === access_token) {
        const newTokenCookie = tokenCookie.filter(
          (a) => a.access_token !== access_token,
        );
        const newSessionCookie = sessionCookie;
        delete newSessionCookie[access_token];

        await store.set("token", newTokenCookie);
        await store.set("session", newSessionCookie);
        await store.save();

        setTokenCookie(newTokenCookie);
        setSessionCookie(newSessionCookie);
        setSession(null);
        setAccessToken("");
      }
    }
  }

  useEffect(() => {
    const urlListener = listen<string>("open_login_url", (url) => {
      open(url.payload);
    });

    const sessionListener = listen<string>("session", async (s) => {
      const store = await load("store.json");
      const tokenCookie = (await store.get<TokenCookie>(
        "token",
      )) as TokenCookie;
      const sessionCookie = (await store.get<SessionCookie>(
        "session",
      )) as SessionCookie;

      const payload = JSON.parse(s.payload) as SessionResponse;

      let sessionFound = false;
      for (const key in sessionCookie) {
        console.log(`key: ${key}`);
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

      if (payload.session.avatar) {
        payload.session.avatar_url = generateAvatarUrl(payload.session);
      }

      sessionCookie[payload.access_token] = payload.session;

      setSession(payload.session);

      setTokenCookie(tokenCookie);
      await store.set("token", tokenCookie);

      setSessionCookie(sessionCookie);
      await store.set("session", sessionCookie);

      await store.save();
    });

    const init = async () => {
      const store = await load("store.json");
      let t = await store.get<TokenCookie | undefined>("token");
      let s = await store.get<SessionCookie | undefined>("session");

      console.log(JSON.stringify(t));
      console.log(JSON.stringify(s));

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
          // setSession(s[a.access_token]);
          break;
        }
      }

      setTokenCookie(t);
      setSessionCookie(s);

      await store.save();
    };

    init();

    return () => {
      sessionListener.then((f) => f());
      urlListener.then((f) => f());
    };
  }, []);

  return (
    <StateContext.Provider
      value={{
        session,
        sessionCookie,
        tokenCookie,
        access_token,
        removeSession,
        loginToSession,
        switchSessions,
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export const StateContext = createContext<StateType | null>(null);
