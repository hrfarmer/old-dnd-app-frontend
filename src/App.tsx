import { invoke } from "@tauri-apps/api/core";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { StateContext } from "./context/StateContext";
import { generateAvatarUrl } from "./utils";

export default function App() {
  const [inputValue, setInputValue] = useState<string>("");
  const navigate = useNavigate();
  const state = useContext(StateContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return; // for sanity
    }
  }, []);

  return (
    <>
      <form
        className="flex gap-3 items-center"
        onSubmit={(evt) => {
          evt.preventDefault();

          invoke("send_message", { message: inputValue });
        }}
      >
        <input
          type="text"
          className="bg-zinc-900/75 rounded-md h-9 px-2 text-white"
          onInput={(i: React.ChangeEvent<HTMLInputElement>) =>
            setInputValue(i.target.value)
          }
        />
        <button className="bg-white text-black h-10 px-4 py-3 rounded-md hover:cursor-pointer flex items-center">
          Send Message
        </button>
      </form>
      <div>
        {state?.connectedUsers.map((user) => (
          <>
            <img
              src={generateAvatarUrl(user[1])}
              className="rounded-full h-11 select-none"
            ></img>
            <p>{user[1].global_name ?? user[1].username}</p>
          </>
        ))}
      </div>
    </>
  );
}
