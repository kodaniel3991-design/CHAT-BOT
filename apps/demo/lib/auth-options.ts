import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function demoPassword(): string {
  return process.env.CHAT_DEMO_PASSWORD ?? "luon-demo";
}

/**
 * 호스트 SaaS와 동일한 앱에서 쓸 때: 사용자는 이미 이 세션으로 로그인한 상태라고 보고
 * Credentials는 데모용. 실제 제품에서는 여기를 Google/OIDC/사내 IdP 등으로 교체.
 */
export const authOptions: NextAuthOptions = {
  /** 로컬 HTTP는 비보안 쿠키, 배포(HTTPS)에서는 secure 쿠키 */
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;
        if (credentials.password !== demoPassword()) return null;
        return {
          id: "demo-user",
          name: "Demo User",
          email: "demo@luon.local",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "demo-user";
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "dev-nextauth-secret-min-32-chars-long!!"),
};
