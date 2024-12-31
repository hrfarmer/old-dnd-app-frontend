import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App";
import Navbar from "./components/Navbar";
import { StateContextProvider } from "./context/StateContext";
import { WebsocketContextProvider } from "./context/WebsocketContext";
import "./main.css";
import LoginPage from "./routes/login";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <StateContextProvider>
        <WebsocketContextProvider>
          <main className="w-full h-screen flex bg-zinc-800">
            <LoginPage>
              <BrowserRouter>
                <Navbar>
                  <Routes>
                    <Route path="/" element={<App />} />
                  </Routes>
                </Navbar>
              </BrowserRouter>
            </LoginPage>
          </main>
        </WebsocketContextProvider>
      </StateContextProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
