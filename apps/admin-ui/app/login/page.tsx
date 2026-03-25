import { signIn } from "../../src/auth.js";

export default function LoginPage() {
  return (
    <main style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Clerk Bot Admin</h1>
      <p>Sign in with your work account to manage rotation and tasks.</p>
      <form
        action={async () => {
          "use server";
          await signIn("azure-ad");
        }}
      >
        <button type="submit" style={{ padding: "10px 14px", cursor: "pointer" }}>
          Sign in
        </button>
      </form>
    </main>
  );
}

