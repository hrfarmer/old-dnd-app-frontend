import { invoke } from "@tauri-apps/api/core";
import React, { useContext, useState } from "react";
import { StateContext } from "../context/StateContext";
import ChatMessage from "./ChatMessage";

export default function ChatPage() {
  const [inputValue, setInputValue] = useState<string>("");
  const state = useContext(StateContext)!;

  return (
    <div className="flex flex-col-reverse h-full">
      <form
        className="flex gap-3 items-center w-full"
        onSubmit={(evt) => {
          evt.preventDefault();
          setInputValue("");

          invoke("send_message", { message: inputValue }).then(() =>
            state.setMessages((msgs) => [
              { author: state.session?.session.id!, content: inputValue },
              ...msgs,
            ])
          );
        }}
      >
        <input
          type="text"
          className="bg-zinc-900/75 rounded-md h-10 border border-neutral-700 px-4 w-full text-white"
          placeholder="Send a message..."
          value={inputValue}
          onInput={(i: React.ChangeEvent<HTMLInputElement>) =>
            setInputValue(i.target.value)
          }
        />
        <button className="bg-white text-black h-10 w-24 px-4 py-3 rounded-md hover:cursor-pointer flex items-center justify-center">
          Send
        </button>
      </form>
      <div className="h-[calc(100vh-8rem)] p-2 flex gap-2 flex-col-reverse overflow-y-auto">
        {state.messages.reverse().map((message, key) => {
          const user = state.connectedUsers.find(
            ([userString]) => userString === message.author
          );

          if (!user) {
            return <div>Invalid user for some reason</div>;
          }
          return (
            <ChatMessage user={user[1]} key={key} message={message.content} />
          );
        })}
      </div>
    </div>
  );
}
