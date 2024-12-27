import { invoke } from "@tauri-apps/api/core";
import React, { useContext, useState } from "react";
import { StateContext } from "../context/StateContext";

export default function LoginPage({ children }: { children: React.ReactNode }) {
  const state = useContext(StateContext)!;
  const [wsActive, setWsActive] = useState(false);

  return state.session ? (
    children
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8">
      {wsActive ? (
        <>
          <p>Logging in with discord, check your web browser</p>
          <p>This page will automatically update once login is complete</p>
        </>
      ) : (
        <button
          className="bg-white px-4 py-2 rounded-md"
          onClick={(evt) => {
            evt.preventDefault();

            invoke("ws_login").then(() => console.log("Should be connected"));
            setWsActive(true);
          }}
        >
          Login with Discord
        </button>
      )}
    </div>
  );
}
