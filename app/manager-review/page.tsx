"use client";
import { GraphPanel } from "../../components/graph-panel";
import { EntityGraphPanel } from "../../components/entity-graph-panel";
import { useEffect, useState } from "react";

type Review = { status: string; rating: number | null; rationale: string; rubricAnchor: string; supportingEvidenceIds: string[]; counterEvidenceIds: string[]; evidence: { id: string; classification: string; sourceText: string }[]; finalizedAt: string | null; jevProposal?: { sufficient: boolean; classification: string; probability: number; rating: number } | null };

export default function ManagerReviewPage() {
  const [review, setReview] = useState<Review | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/manager-review").then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setReview(body); }).catch(e => setError(e.message)); }, []);
  if (error) return <main><h1>Manager review</h1><p role="alert">{error}</p></main>;
  if (!review) return <main><p>Loading…</p></main>;
  async function submit(method: "PUT" | "POST") {
    setMessage("");
    const body = { rating: Number((document.getElementById("rating") as HTMLInputElement).value), rationale: (document.getElementById("rationale") as HTMLTextAreaElement).value, rubricAnchor: (document.getElementById("anchor") as HTMLInputElement).value, supportingEvidenceIds: (document.getElementById("support") as HTMLInputElement).value.split(",").map(x => x.trim()).filter(Boolean), counterEvidenceIds: (document.getElementById("counter") as HTMLInputElement).value.split(",").map(x => x.trim()).filter(Boolean) };
    const r = await fetch("/api/manager-review", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await r.json();
    if (!r.ok) { setMessage(result.error); return; }
    setMessage(method === "POST" ? "Finalized" : "Saved");
    setReview({ ...result, evidence: result.evidence ?? [], finalizedAt: result.finalizedAt ?? null });
  }
  async function runEvidenceBtn() {
    setMessage("Running AI evidence pass…");
    const r = await fetch("/api/ai-evidence", { method: "POST" });
    const result = await r.json();
    if (!r.ok) { setMessage(result.error); return; }
    setMessage("AI evidence pass complete — trace refreshed.");
    const refresh = await fetch("/api/manager-review");
    if (refresh.ok) setReview(await refresh.json());
  }
  return (
    <main>
      <h1>Manager review</h1>
      <p>Status: {review.status === "final" ? "Final (manager)" : review.status === "draft" ? "Manager-confirmed (draft)" : "No manager decision yet"}</p>
      {review.jevProposal && (
        <section aria-label="AI proposal">
          <h2>AI proposal (Jev)</h2>
          <p>Sufficient: {review.jevProposal.sufficient ? "yes" : "no — evidence package insufficient for a reliable rating"} | Stance: {review.jevProposal.classification} | Probability: {(review.jevProposal.probability * 100).toFixed(0)}% | Proposed rating: {review.jevProposal.rating}</p>
          <p style={{ fontStyle: "italic" }}>AI proposal — informational only; decisions are manager-confirmed.</p>
        </section>
      )}
      <GraphPanel />
      <EntityGraphPanel />
      <form onSubmit={e => { e.preventDefault(); void submit("PUT"); }}>
        <label>Rating (1–5) <input id="rating" type="number" min="1" max="5" defaultValue={review.rating ?? 3} required /></label><br />
        <label>Rubric anchor <input id="anchor" defaultValue={review.rubricAnchor} placeholder="anchor-problem-solving-3" required /></label><br />
        <label>Rationale <textarea id="rationale" defaultValue={review.rationale} required /></label><br />
        <label>Supporting Evidence IDs <input id="support" defaultValue={review.supportingEvidenceIds.join(", ")} /></label><br />
        <label>Counter Evidence IDs <input id="counter" defaultValue={review.counterEvidenceIds.join(", ")} /></label><br />
        <button disabled={review.status === "final"}>Save draft</button>{' '}
        <button type="button" disabled={review.status === "final"} onClick={() => void submit("POST")}>Finalize once</button>
      </form>
      <p role="status">{message}</p>
      <h2>Evidence trace</h2>
      <button type="button" className="secondary" style={{ marginBottom: "0.5rem" }} onClick={() => void runEvidenceBtn()}>Run AI evidence pass</button>
      <ul>{review.evidence.map(e => <li key={e.id}><strong>{e.id}</strong> ({e.classification === "contradiction" ? "counter-evidence" : e.classification}): {e.sourceText}</li>)}</ul>
    </main>
  );
}
