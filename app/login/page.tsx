"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initialUser = params.get("userId") ?? "";
  const initialPassword = params.get("password") ?? "";
  async function login(userId: FormDataEntryValue | null, password: FormDataEntryValue | null) {
    setBusy(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) });
    if (response.ok) window.location.href = "/";
    else { setBusy(false); setError("Invalid credentials"); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await login(form.get("userId"), form.get("password"));
  }
  useEffect(() => { if (initialUser && initialPassword) void login(initialUser, initialPassword); }, []);
  return <main><h1>Sign in</h1><form onSubmit={submit}><label>User ID <input name="userId" required autoComplete="username" defaultValue={initialUser} /></label><label>Password <input name="password" type="password" required autoComplete="current-password" defaultValue={initialPassword} /></label><button type="submit" disabled={busy}>Sign in</button>{error && <p role="alert">{error}</p>}</form></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main><h1>Sign in</h1><p aria-busy="true">Loading…</p></main>}><LoginForm /></Suspense>;
}
