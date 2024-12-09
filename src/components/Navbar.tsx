import { invoke } from "@tauri-apps/api/core";
import { useContext } from "react";
import { FaDiceD20 } from "react-icons/fa";
import { IoMdHome } from "react-icons/io";
import { NavLink } from "react-router";
import { SessionContext } from "../context/SessionContext";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  const session = useContext(SessionContext);

  return (
    <>
      {token !== null && (
        <div className="flex flex-col w-full min-h-screen">
          <div className="p-2 fixed top-0 left-0 right-0 z-50 h-18 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-700 rounded-md border border-neutral-600 flex justify-between items-center select-none px-3">
              <div className="flex items-center gap-3 py-2 h-full w-128">
                <NavLink
                  to={"/"}
                  className={({ isActive }) =>
                    `w-26 flex gap-2 items-center px-2 h-full text-white rounded-sm ${
                      isActive && "bg-neutral-500"
                    }`
                  }
                >
                  <IoMdHome size={20} />
                  <p>Home</p>
                </NavLink>
                <NavLink
                  to={"/dice"}
                  className={({ isActive }) =>
                    `w-26 flex gap-2 items-center px-2 h-full text-white rounded-sm ${
                      isActive && "bg-neutral-500"
                    }`
                  }
                >
                  <FaDiceD20 size={18} />
                  <p>Dice</p>
                </NavLink>
              </div>
              {session ? (
                <img
                  src={session.avatar_url}
                  className="rounded-full h-11 select-none"
                ></img>
              ) : (
                <button
                  className="bg-blue-500 text-white h-10 flex items-center px-4 py-3 rounded-md hover:cursor-pointer"
                  onClick={() => invoke("connect", { token: token })}
                >
                  Connect
                </button>
              )}
            </div>
          </div>
          <div className="pt-20 p-2 w-full flex-grow">{children}</div>
        </div>
      )}
    </>
  );
}
