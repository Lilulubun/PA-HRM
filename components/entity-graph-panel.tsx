"use client";
import { useState } from "react";

type Node = { id: string; label: string; properties: Record<string, unknown> };
type Edge = { from: string; to: string; type: string };
type Data = { center: Node | null; nodes: Node[]; edges: Edge[]; status: string; error?: string };

export function EntityGraphPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  async function load() {
    setOpen(true); setError(""); setData(null);
    const r = await fetch("/api/entity-graph");
    const body = await r.json();
    if (!r.ok) { setError(body.error ?? "Failed to load graph"); return; }
    setData(body);
  }
  return (
    <section aria-labelledby="entity-graph-heading">
      <h2 id="entity-graph-heading">Entity-centric knowledge graph</h2>
      <button type="button" onClick={() => void load()}>Show entity graph</button>
      {open && (error ? <p role="alert">{error}</p> : !data ? <p aria-busy="true">Loading…</p> : (
        <div>
          <p>Center: <strong>{data.center?.id ?? "none"}</strong> — {data.nodes.length} nodes, {data.edges.length} edges within 2 hops.</p>
          <ul>
            {data.edges.map((e) => {
              const from = data.nodes.find(n => n.id === e.from);
              const to = data.nodes.find(n => n.id === e.to);
              return <li key={`${e.from}-${e.type}-${e.to}`}><code>{from?.label}:{e.from} -[{e.type}]-&gt; {to?.label}:{e.to}</code></li>;
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
