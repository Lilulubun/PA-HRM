"use client";
import { useEffect, useState } from "react";

type Masked = { llmBaseUrl: string; jevBaseUrl: string; llmModel?: string; llmVersion?: string; llmApiKeyConfigured: boolean; jevApiKeyConfigured: boolean } | null;

export function SettingsForm() {
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState<Masked>(null);
  useEffect(() => { fetch("/api/settings").then(async r => { if (!r.ok) return; setCurrent(await r.json()); }).catch(() => setCurrent(null)); }, []);
  async function save(form: FormData) {
    const response = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const body = await response.json();
    setMessage(response.ok ? "Saved" : body.error);
    if (response.ok) setCurrent(body);
  }
  async function upload(form: FormData) {
    const response = await fetch("/api/fixtures", { method: "POST", body: form });
    setMessage(response.ok ? "Imported" : (await response.json()).error);
  }
  return (
    <>
      <form action={save}>
        <label>LLM base URL <input name="llmBaseUrl" required defaultValue={current?.llmBaseUrl} /></label>
        <label>Jev base URL <input name="jevBaseUrl" required defaultValue={current?.jevBaseUrl} /></label>
        <label>Model <input name="llmModel" defaultValue={current?.llmModel} /></label>
        <label>Version <input name="llmVersion" defaultValue={current?.llmVersion} /></label>
        <label>LLM API key <input type="password" name="llmApiKey" placeholder={current?.llmApiKeyConfigured ? "configured (hidden) — leave blank to keep" : "paste key"} autoComplete="off" /></label>
        <label>Jev API key <input type="password" name="jevApiKey" placeholder={current?.jevApiKeyConfigured ? "configured (hidden) — leave blank to keep" : "paste key"} autoComplete="off" /></label>
        <button>Save</button>
      </form>
      <p>Keys are stored server-side only (data/.settings.json, mode 600) and never returned to the browser. Status: LLM key {current?.llmApiKeyConfigured ? "configured" : "not set"}; Jev key {current?.jevApiKeyConfigured ? "configured" : "not set"}.</p>
      <h2>CSV fixture upload</h2>
      <p>Use data/template.csv. UTF-8, quoted commas, escaped quotes supported. Invalid files write nothing.</p>
      <form action={upload} encType="multipart/form-data">
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button>Upload</button>
      </form>
      <p>{message}</p>
    </>
  );
}
