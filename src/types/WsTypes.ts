export type SessionType = {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  avatar_url?: string;
  accent_color?: number;
};

export type ChatMessageType = {
  author: string;
  content: string;
};
