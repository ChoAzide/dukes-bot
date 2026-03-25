import Link from "next/link";
import { auth, signOut } from "../src/auth.js";

export default async function HomePage() {
  const session = await auth();
  const oid = (session as any)?.oid ?? "";

  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Clerk Bot Admin</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.75 }}>Signed in as Entra OID: {oid}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit" style={{ padding: "10px 14px", cursor: "pointer" }}>
            Sign out
          </button>
        </form>
      </header>

      <section style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <Card title="Rotation" href="/rotation" description="Roster order and shared-week day split." />
        <Card title="Tasks" href="/tasks" description="Daily/weekly/monthly tasks and cadence rules." />
        <Card title="Settings" href="/settings" description="Reminder time, channel binding, admins." />
      </section>
    </main>
  );
}

function Card({ title, href, description }: { title: string; href: string; description: string }) {
  return (
    <Link
      href={href}
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        padding: 16,
        textDecoration: "none",
        color: "inherit"
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <p style={{ margin: "8px 0 0", opacity: 0.75 }}>{description}</p>
    </Link>
  );
}

