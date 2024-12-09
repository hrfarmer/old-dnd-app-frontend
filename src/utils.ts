import { SessionType } from "./types/WsTypes";

export function generateAvatarUrl(session: SessionType) {
  return `https://cdn.discordapp.com/avatars/${session.id}/${session.avatar}`;
}
