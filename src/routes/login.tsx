import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function LoginPage() {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [err, setErr] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    invoke("get_login_url").then((url) => setUrl(url as string));
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8">
      {url ? (
        <>
          <button
            className="bg-[#5865F2] px-4 py-2 rounded-md shadow-md text-white hover:cursor-pointer"
            onClick={() => {
              open(url), setShowInput(true);
            }}
          >
            Login with Discord
          </button>
          <button onClick={() => navigator.clipboard.writeText(url)}>
            Copy url
          </button>
          {showInput && (
            <form
              onSubmit={(evt) => {
                evt.preventDefault();

                invoke("check_token_valid", { token: inputValue })
                  .then(() => {
                    localStorage.setItem("token", inputValue);
                    navigate("/");
                  })
                  .catch(() => setErr(true));
              }}
              className="flex gap-4"
            >
              <input
                className="bg-zinc-900/75 rounded-md h-9 px-2 text-white"
                type="text"
                name="token-input"
                onInput={(i: React.ChangeEvent<HTMLInputElement>) =>
                  setInputValue(i.target.value)
                }
              />
              <button
                type="submit"
                className="bg-white text-black h-9 rounded-md px-4 hover:cursor-pointer"
              >
                Submit
              </button>
            </form>
          )}
          {err && (
            <div className="w-64 h-16 bg-red-900/75 rounded-md shadow-md">
              There was an error authenticating
            </div>
          )}
        </>
      ) : (
        <div className="bg-red-900/40 shadow-md w-76 h-16 rounded-md flex items-center justify-center">
          <p>Failed to fetch login url</p>
        </div>
      )}
    </div>
  );
}
