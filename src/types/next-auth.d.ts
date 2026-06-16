import { DefaultSession, DefaultJWT } from "next-auth";

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      avatarUrl: string | null;
    } & DefaultSession['user'];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id:               string;
    role:             string;
    // Unix timestamp (seconds) of the last time we re-verified
    // active status against the database. Used to implement the
    // 5-minute cache window in the jwt() callback.
    activeCheckedAt:  number;
  }
}