import { SessionType } from "../types/WsTypes";
import { generateAvatarUrl } from "../utils";

export default function ChatMessage({
  user,
  message,
}: {
  user: SessionType;
  message: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={generateAvatarUrl(user)}
        className="w-10 h-10 rounded-full"
        alt=""
      />
      <p>
        <span className="font-bold text-lg">
          {user.global_name ?? user.username}:
        </span>{" "}
        {message}
      </p>
    </div>
  );
}
