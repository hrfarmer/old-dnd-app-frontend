import { invoke } from "@tauri-apps/api/core";
import React, { useContext, useEffect, useState } from "react";
import { StateContext } from "../context/StateContext";
import { listen } from "@tauri-apps/api/event";

export default function LoginPage({ children }: { children: React.ReactNode }) {
  const state = useContext(StateContext)!;
  const [wsActive, setWsActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    const listener = listen<string>("login_disconnect", (e) => {
      setWsActive(false);
      setErr(e.payload);
    });

    return () => {
      listener.then((r) => r());
    };
  }, []);

  return state.session ? (
    children
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-20 pt-10 gap-8">
      <h1 className="text-white text-5xl font-bold">Welcome to the D&D App!</h1>
      {state.tokenCookie.length === 0 ? (
        <p>No users found. Login to get started.</p>
      ) : (
        <div className="w-176 h-72 bg-neutral-800 rounded-md flex gap-3 p-4">
          {state.tokenCookie.map((t, idx) => (
            <button
              key={idx}
              className={`h-full w-52 flex flex-col gap-8 items-center justify-center hover:cursor-pointer rounded-md ${selectedUser === t.access_token ? "bg-neutral-700 border border-neutral-600" : "bg-zinc-800"}`}
              onClick={(evt) => {
                evt.preventDefault();

                if (selectedUser === t.access_token) {
                  setSelectedUser(null);
                  return;
                }

                setSelectedUser(t.access_token);
              }}
            >
              <img
                src={state.sessionCookie[t.access_token].avatar_url}
                alt={`${state.sessionCookie[t.access_token].username} profile picture`}
                className="w-24 h-24 rounded-full"
              />
              <p className="font-bold text-xl">
                {state.sessionCookie[t.access_token].username}
              </p>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        {state.tokenCookie.length > 0 && (
          <button
            className={`px-4 py-2 rounded-md text-white transition-all ${selectedUser ? "bg-blue-500 hover:cursor-pointer" : "bg-gray-700 text-gray"}`}
            onClick={(evt) => {
              evt.preventDefault();

              if (selectedUser) {
                state.setSession(state.sessionCookie[selectedUser]);
              }
            }}
          >
            Sign In
          </button>
        )}
        <button
          className="bg-white px-4 py-2 rounded-md"
          onClick={(evt) => {
            evt.preventDefault();

            if (err) {
              setErr(null);
            }

            console.log("Connected to login websocket");
            setWsActive(true);

            invoke("ws_login")
              .then(() => {})
              .catch((err) => {
                setErr(err);
                setWsActive(false);
              });
          }}
        >
          Add New Account with Discord
        </button>
      </div>
      {err && (
        <div className="w-156 h-36 rounded-md bg-red-500/40 flex items-center justify-center">
          <p>An error occured: {err}</p>
        </div>
      )}
      {wsActive && (
        <p>
          Opened login url in your default browser. Come back once you're signed
          in.
        </p>
      )}
    </div>
  );
}
