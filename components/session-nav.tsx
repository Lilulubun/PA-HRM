import { getSession } from "../lib/auth";
import { PathNav } from "./path-nav";
import { LogoutButton } from "./logout-button";

export async function SessionNav() {
  const session = await getSession();
  return (
    <>
      <PathNav session={session} />
      {session && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 0 0.5rem 0", fontSize: "small" }}>
          <span>Signed in as {session.userId} ({session.role})</span>
          <LogoutButton />
        </div>
      )}
    </>
  );
}
