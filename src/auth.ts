import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken?: string;
  expiresAt?: number;
  refreshToken?: string;
}> {
  const clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return {};

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) return {};

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!data.access_token) return {};
  return {
    accessToken: data.access_token,
    expiresAt: typeof data.expires_in === "number" ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
    refreshToken: data.refresh_token,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/fitness.activity.read",
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  trustHost: true,
  pages: {
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, profile, account }) {
      if (profile?.sub) {
        token.sub = profile.sub;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (typeof account?.expires_at === "number") {
        token.accessTokenExpiresAt = account.expires_at;
      }
      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      if (
        typeof token.accessToken === "string" &&
        (typeof token.accessTokenExpiresAt !== "number" || token.accessTokenExpiresAt > nowSec + 60)
      ) {
        return token;
      }

      if (typeof token.refreshToken !== "string" || token.refreshToken.length === 0) {
        return token;
      }

      const refreshed = await refreshGoogleAccessToken(token.refreshToken);
      if (refreshed.accessToken) {
        token.accessToken = refreshed.accessToken;
      }
      if (typeof refreshed.expiresAt === "number") {
        token.accessTokenExpiresAt = refreshed.expiresAt;
      }
      if (typeof refreshed.refreshToken === "string" && refreshed.refreshToken.length > 0) {
        token.refreshToken = refreshed.refreshToken;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      return session;
    },
  },
});
