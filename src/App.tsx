import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function App() {
  const [token, setToken] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log(`The token is ${token}`);

    if (!token) {
      navigate("/login");
      return; // for sanity
    }

    setToken(token);
  }, []);

  return (
    <>
      <button
        className="bg-blue-500 h-10 flex items-center px-4 py-3 rounded-md hover:cursor-pointer"
        onClick={() => invoke("connect")}
      >
        Connect
      </button>
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
    </>
  );
}
