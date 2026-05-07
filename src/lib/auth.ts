import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validate login input
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },

  pages: { signIn: '/login' },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      // Called when user submits login form
      async authorize(credentials) {
        // Validate input using Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, password')
          .eq('email', parsed.data.email)
          .single();

        if (error || !data) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          data.password
        );

        if (!valid) return null;

        return {
          id: data.id,
          email: data.email,
          name: data.name,
        };
      },
    }),
  ],

  callbacks: {

    async jwt({ token, user }) {
      if (user) token.id = user.id; 
      return token;
    },

    // Controls what is available on the frontend session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string; 
      }
      return session;
    },
  },
});