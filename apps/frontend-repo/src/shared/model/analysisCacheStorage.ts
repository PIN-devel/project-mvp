export const ANALYSIS_CACHE_PREFIX = "motifin:analysis:v1:";

// An opaque login-session namespace: no token, login ID or card details in cache keys.
export function createAnalysisNamespace(): string | null {
  try { return crypto.randomUUID(); } catch { return null; }
}

export function getActiveAnalysisNamespace(): string | null {
  try {
    const session = JSON.parse(localStorage.getItem("app-storage") ?? "null")?.state;
    return session?.isAuthenticated && typeof session.analysisNamespace === "string"
      ? session.analysisNamespace : null;
  } catch { return null; }
}

export function clearAnalysisExperienceCaches() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(ANALYSIS_CACHE_PREFIX)) localStorage.removeItem(key);
    }
  } catch { /* Storage restrictions must not block logout. */ }
}
