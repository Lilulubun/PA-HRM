import Link from "next/link";
import type { Session } from "../lib/auth";

const paths = [
  { href: "/login", label: "Login", roles: null },
  { href: "/self-review", label: "Self-review", roles: ["employee"] as const },
  { href: "/peer-setup", label: "Peer setup", roles: ["manager"] as const },
  { href: "/settings", label: "Settings", roles: ["manager"] as const },
  { href: "/manager-review", label: "Manager review", roles: ["manager"] as const },
];

export function PathNav({ session }: { session: Session | null }) {
  const role = session?.role ?? null;
  const visible = paths.filter((p) => !p.roles || (role && (p.roles as readonly string[]).includes(role)));
  return (
    <nav aria-label="App paths">
      <ul style={{ display: "flex", gap: "1rem", listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
        {visible.map((p) => (
          <li key={p.href}><Link href={p.href}>{p.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}
