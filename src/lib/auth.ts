import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// How long a JWT lives — 8 hours (one working day)
const SESSION_MAX_AGE = 8 * 60 * 60; // seconds

// How often we re-check active status against the DB.
const ACTIVE_CHECK_INTERVAL = 5 * 60; // seconds

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user } = await supabase
          .from("users")
          .select("id, name, email, password, role, active, avatar_url")
          .eq("email", credentials.email as string)
          .single();

        if (!user) return null;

        // Deactivated users are rejected before password check
        if (!user.active) throw new Error("DEACTIVATED");

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id:        user.id,
          name:      user.name,
          email:     user.email,
          role:      user.role,
          avatarUrl: user.avatar_url,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   SESSION_MAX_AGE,
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // ── Initial sign-in — seed the token ──────────────────
      if (user) {
        token.id              = user.id;
        token.role            = (user as { role: string }).role;
        token.avatarUrl       = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
        token.activeCheckedAt = Math.floor(Date.now() / 1000); // unix seconds
        return token;
      }

      // ── Client called update(...) — merge new fields directly ─────
      // e.g. the settings page calls update({ avatarUrl }) after an
      // upload so the sidebar/topbar reflect the new picture immediately
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      // ── Subsequent requests — re-verify active status ─────
      const now               = Math.floor(Date.now() / 1000);
      const lastChecked       = (token.activeCheckedAt as number) ?? 0;
      const secondsSinceCheck = now - lastChecked;

      // Within the cache window — trust the token as-is
      if (secondsSinceCheck < ACTIVE_CHECK_INTERVAL) {
        return token;
      }

      // Outside the window — re-check against DB
      const { data: user_ } = await supabase
        .from("users")
        .select("active, role, avatar_url")
        .eq("id", token.id as string)
        .single();

      // User deleted or deactivated — returning null kills the session
      if (!user_ || !user_.active) {
        return null;
      }

      token.role            = user_.role;
      token.avatarUrl       = user_.avatar_url;
      token.activeCheckedAt = now;

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id as string;
        session.user.role      = token.role as string;
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },
});