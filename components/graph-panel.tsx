"use client";
import { useState } from "react";

type GraphData = { nodes: number; relationships: number; labels: { label: string; count: number }[]; relationshipTypes: { type: string; count: number }[]; status: string; error?: string };

export function GraphPanel({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState("");
  async function load() {
    setOpen(true); setError(""); setData(null);
    const r = await fetch("/api/graph");
    const body = await r.json();
    if (!r.ok) { setError(body.error ?? "Failed to load graph"); return; }
    setData(body);
  }
  return (
    <section aria-labelledby="graph-heading">
      <h2 id="graph-heading">Knowledge graph</h2>
      <button type="button" onClick={() => void load()}>Show knowledge graph</button>
      {open && (error ? <p role="alert">{error}</p> : !data ? <p aria-busy="true">Loading…</p> : (
        <div>
          <p>{data.nodes} nodes, {data.relationships} relationships.</p>
          {!compact && <><h3>Labels</h3><ul>{data.labels.map((l) => <li key={l.label}>{l.label}: {l.count}</li>)}</ul></>}
          <h3>Relationships</h3>
          <ul>{data.relationshipTypes.map((t) => <li key={t.type}>{t.type}: {t.count}</li>)}</ul>
        </div>
      ))}
    </section>
  );
}
