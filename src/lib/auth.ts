import { NextAuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextResponse } from 'next/server';
import { getUserByEmail, upsertUser } from './data-store';
import { UserRole } from './types';

// Admin allowlist parsed from environment
export function getAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_EMAILS || 'admin@example.com,superadmin@secureportal.com';
  return envAdmins
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailInAdminAllowlist(email: string): boolean {
  if (!email) return false;
  const adminList = getAdminEmails();
  return adminList.includes(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback_development_secret_32_chars_long_minimum',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
    }),
    // Development evaluation provider: enables instantaneous persona testing
    // without requiring reviewers to configure Google OAuth API credentials upfront.
    CredentialsProvider({
      id: 'dev-persona-login',
      name: 'Development Persona Login',
      credentials: {
        role: { label: 'Role', type: 'text' },
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH !== 'true') {
          return null;
        }
        const role = (credentials?.role as UserRole) || 'viewer';
        const email = credentials?.email?.toLowerCase() || (role === 'admin' ? 'admin@example.com' : 'viewer@example.com');
        const name = role === 'admin' ? 'Jane Admin (Demo)' : 'Alex Viewer (Demo)';

        const user = await upsertUser({
          email,
          name,
          role,
          avatar_url:
            role === 'admin'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
              : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar_url,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      // Check if user should be elevated to Admin based on allow-list
      const isAllowlistedAdmin = isEmailInAdminAllowlist(email);
      const assignedRole: UserRole = isAllowlistedAdmin ? 'admin' : ((user as unknown as { role?: UserRole }).role || 'viewer');

      try {
        const dbUser = await upsertUser({
          email,
          name: user.name || email.split('@')[0],
          avatar_url: user.image || undefined,
          role: assignedRole,
        });

        user.id = dbUser.id;
        (user as unknown as { role: UserRole }).role = dbUser.role;
        return true;
      } catch (err) {
        console.error('Error during signIn callback upsert:', err);
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: UserRole }).role || 'viewer';
      } else if (token.email) {
        // Refresh role from store if needed
        const dbUser = await getUserByEmail(token.email);
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || 'viewer';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

// Helper to get server-side session in Route Handlers and Server Components
export async function getServerAuthSession() {
  return await getServerSession(authOptions);
}

// Server-side guard: Ensures caller is authenticated
export async function requireAuthSession() {
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { session, errorResponse: null };
}

// Server-side guard: Ensures caller is an authenticated ADMIN (Strict 403 enforcement)
export async function requireAdminSession() {
  const { session, errorResponse } = await requireAuthSession();
  if (errorResponse) {
    return { session: null, errorResponse };
  }

  if (session?.user.role !== 'admin') {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Caller does not possess Admin privileges',
          requiredRole: 'admin',
          actualRole: session?.user.role,
        },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}
