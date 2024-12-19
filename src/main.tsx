import { invoke } from "@tauri-apps/api/core";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App";
import Navbar from "./components/Navbar";
import { StateContextProvider } from "./context/StateContext";
import { WebsocketContextProvider } from "./context/WebsocketContext";
import "./main.css";
import LoginPage from "./routes/login";

const token = localStorage.getItem("token");

if (token) {
  invoke("check_token_valid", { token: token }).catch(() =>
    localStorage.removeItem("token")
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StateContextProvider>
      <WebsocketContextProvider>
        <main className="w-full h-screen flex bg-zinc-800">
          <BrowserRouter>
            <Navbar>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </Navbar>
          </BrowserRouter>
        </main>
      </WebsocketContextProvider>
    </StateContextProvider>
  </React.StrictMode>
);
