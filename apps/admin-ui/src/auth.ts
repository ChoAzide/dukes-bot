import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";

function allowedAdminObjectIds(): Set<string> {
  const raw = process.env.ADMIN_ENTRA_OBJECT_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.ENTRA_ID_CLIENT_ID!,
      clientSecret: process.env.ENTRA_ID_CLIENT_SECRET!,
      tenantId: process.env.ENTRA_ID_TENANT_ID!
    })
  ],
  callbacks: {
    async jwt({ token, profile }) {
      const oid = (profile as any)?.oid ?? (profile as any)?.sub;
      if (oid) token.oid = oid;
      return token;
    },
    async session({ session, token }) {
      (session as any).oid = (token as any).oid;
      (session as any).isAdmin = allowedAdminObjectIds().has(String((token as any).oid ?? ""));
      return session;
    }
  }
});

