import { invoke } from "@tauri-apps/api/core";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App";
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
    <main className="w-full h-screen flex p-2 bg-zinc-800">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </main>
  </React.StrictMode>
);
