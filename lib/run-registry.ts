type RunState = { id: string; status: "running" | "done" | "failed"; startedAt: number; result?: unknown };

const runs = new Map<string, RunState>();
const activeByAppraisal = new Map<string, string>();

export function getRun(appraisalId: string, runId: string): RunState | null {
  const run = runs.get(`${appraisalId}:${runId}`);
  return run ?? null;
}

export function activeRun(appraisalId: string): RunState | null {
  const id = activeByAppraisal.get(appraisalId);
  if (!id) return null;
  const run = runs.get(`${appraisalId}:${id}`);
  return run && run.status === "running" ? run : null;
}

export function tryStartRun(appraisalId: string, runId: string): { started: true } | { started: false; reason: "duplicate_id" | "active_run"; existing: RunState } {
  const key = `${appraisalId}:${runId}`;
  const existing = runs.get(key);
  if (existing) return { started: false, reason: "duplicate_id", existing };
  const active = activeRun(appraisalId);
  if (active) return { started: false, reason: "active_run", existing: active };
  const run: RunState = { id: runId, status: "running", startedAt: Date.now() };
  runs.set(key, run);
  activeByAppraisal.set(appraisalId, runId);
  return { started: true };
}

export function finishRun(appraisalId: string, runId: string, status: "done" | "failed", result: unknown): void {
  const key = `${appraisalId}:${runId}`;
  const run = runs.get(key);
  if (run) { run.status = status; run.result = result; }
  if (activeByAppraisal.get(appraisalId) === runId) activeByAppraisal.delete(appraisalId);
}
