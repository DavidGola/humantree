export interface GeneratedTree {
  name: string;
  description: string;
  tags: string[];
  skills: {
    id: number;
    name: string;
    description: string;
    is_root: boolean;
    unlock_ids: number[];
  }[];
  _metadata?: {
    provider_used: string;
    fallback_used: boolean;
    fallback_provider: string | null;
    quality_score: number | null;
    quality_feedback: string | null;
    attempts: number;
    agent_duration_seconds: number;
  };
}

export type GenerateTreeSSEEvent =
  | { type: "progress"; phase: "generating" | "evaluating" | "improving"; attempt?: number }
  | { type: "done"; data: GeneratedTree }
  | { type: "error"; detail: string };

const getBaseURL = () => (import.meta.env.VITE_API_URL as string) ?? "";

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseURL()}/users/refresh/`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** POST avec retry 401 → refresh → logout, retourne la Response si ok. */
async function fetchStream(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const opts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  };

  let response = await fetch(url, opts);

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      window.dispatchEvent(new CustomEvent("auth:logout"));
      throw new Error("Session expirée");
    }
    response = await fetch(url, opts);
  }

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Erreur ${response.status}`);
  }

  return response;
}

async function streamSSE(
  url: string,
  body: unknown,
  onEvent: (event: GenerateTreeSSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetchStream(url, body, signal);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (raw) onEvent(JSON.parse(raw) as GenerateTreeSSEEvent);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function streamText(
  url: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetchStream(url, body, signal);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunk(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

export const aiApi = {
  generateTreeStream: (
    prompt: string,
    provider: string | undefined,
    onEvent: (event: GenerateTreeSSEEvent) => void,
    signal?: AbortSignal,
  ) =>
    streamSSE(
      `${getBaseURL()}/ai/generate-tree`,
      { prompt, provider },
      onEvent,
      signal,
    ),

  enrichSkillStream: (
    params: {
      skillName: string;
      treeName?: string;
      treeDescription?: string;
      currentDescription?: string;
      provider?: string;
    },
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ) =>
    streamText(
      `${getBaseURL()}/ai/enrich-skill`,
      {
        skill_name: params.skillName,
        tree_name: params.treeName,
        tree_description: params.treeDescription,
        current_description: params.currentDescription,
        provider: params.provider,
      },
      onChunk,
      signal,
    ),
};
