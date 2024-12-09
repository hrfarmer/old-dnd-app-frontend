export type SessionType = {
  id: string;
  username: string;
  discriminator: string;
  globalName?: string;
  avatar?: string;
  avatar_url?: string;
  bot?: boolean;
  system?: boolean;
  mfaEnabled?: boolean;
  banner?: string;
  accentColor?: number;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premiumType?: number;
  publicFlags?: number;
};
