import Link from "next/link";
import { getSession } from "../lib/auth";
import type { Session } from "../lib/auth";
import { PathNav } from "../components/path-nav";
import { GraphPanel } from "../components/graph-panel";


export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>PA-HRM</h1>
        <p>Evidence-traceable performance appraisal prototype.</p>
        <p><Link href="/login" style={{ display: "inline-block", padding: "0.5rem 1rem", border: "1px solid #555", borderRadius: "0.25rem" }}>Sign in to continue</Link></p>
        <p style={{ fontSize: "small", marginTop: "2rem" }}>All data in this prototype is synthetic. Not a real organization. Not a validated appraisal instrument.</p>
      </main>
    );
  }
  const manager = session.role === "manager";
  return (
    <main>
      <h1>PA-HRM</h1>
      <p>Signed in as <strong>{session.userId}</strong> ({session.role}).</p>
      <PathNav session={session} />
      <h2>{manager ? "Manager workspace" : "Your workspace"}</h2>
      {manager ? (
        <ul>
          <li><Link href="/manager-review">Appraisal review — trace evidence, edit draft, finalize</Link></li>
          <li><Link href="/settings">Settings — LLM/Jev base URLs, API keys, CSV upload</Link></li>
          <li><GraphPanel compact /></li>
          <li><a href="http://localhost:7474" target="_blank" rel="noreferrer">Open Neo4j database UI</a></li>
        </ul>
      ) : (
        <ul>
          <li><Link href="/self-review">Self-review — answer prompts, save draft, submit</Link></li>
          <li><a href="http://localhost:7474" target="_blank" rel="noreferrer">Open Neo4j database UI</a></li>
        </ul>
      )}
      <AppraisalBadge disabled={!manager} />
    </main>
  );
}

function AppraisalBadge({ disabled }: { disabled: boolean }) {
  if (disabled) return null;
  return <p>Appraisal and evidence trace are available from the manager review screen.</p>;
}
