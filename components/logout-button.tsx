"use client";

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return <button type="button" onClick={() => void logout()} disabled={busy}>Sign out</button>;
}
