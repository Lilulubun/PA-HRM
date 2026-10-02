import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type ModelSettings = { llmBaseUrl: string; jevBaseUrl: string; llmModel?: string; llmVersion?: string; llmApiKey?: string; jevApiKey?: string };
const file = path.join(process.cwd(), "data", ".settings.json");
function url(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  let parsed: URL; try { parsed = new URL(value); } catch { throw new Error(`${name} must be valid URL`); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error(`${name} must use http or https`);
  return parsed.toString().replace(/\/$/, "");
}
export async function getSettings(): Promise<ModelSettings | null> { try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; } }


export async function mergeSettings(input: unknown): Promise<ModelSettings> {
  const stored = (await getSettings()) ?? { llmBaseUrl: "", jevBaseUrl: "" };
  if (!input || typeof input !== "object") throw new Error("Invalid settings");
  const item = input as Record<string, unknown>;
  const llmUrl = item.llmBaseUrl === undefined ? stored.llmBaseUrl : url(item.llmBaseUrl, "llmBaseUrl");
  const jevUrl = item.jevBaseUrl === undefined ? stored.jevBaseUrl : url(item.jevBaseUrl, "jevBaseUrl");
  if (!llmUrl || !jevUrl) throw new Error(`${!llmUrl ? "llmBaseUrl" : "jevBaseUrl"} must be a valid URL`);
  const result: ModelSettings = { llmBaseUrl: llmUrl, jevBaseUrl: jevUrl };
  for (const key of ["llmModel", "llmVersion", "llmApiKey", "jevApiKey"] as const) {
    const value = item[key] === undefined ? stored[key] : item[key] === "" ? undefined : item[key];
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > 500) throw new Error(`${key} invalid`);
      result[key] = value;
    }
  }
  return result;
}

export type MaskedSettings = { llmBaseUrl: string; jevBaseUrl: string; llmModel?: string; llmVersion?: string; llmApiKeyConfigured: boolean; jevApiKeyConfigured: boolean };

export function maskSettings(settings: ModelSettings): MaskedSettings {
  return { llmBaseUrl: settings.llmBaseUrl, jevBaseUrl: settings.jevBaseUrl, llmModel: settings.llmModel, llmVersion: settings.llmVersion, llmApiKeyConfigured: Boolean(settings.llmApiKey), jevApiKeyConfigured: Boolean(settings.jevApiKey) };
}
export async function saveSettings(input: unknown): Promise<ModelSettings> {
  const settings = await mergeSettings(input); await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`; await writeFile(tmp, JSON.stringify(settings, null, 2), { mode: 0o600 }); await rename(tmp, file); return settings;
}
