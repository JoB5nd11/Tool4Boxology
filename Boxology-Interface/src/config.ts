export const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Virtuoso SPARQL editor URL.
// Priority: explicit env override → same-origin /sparql (production, where nginx
// proxies it) → localhost:8890 (local dev, where Virtuoso is exposed directly).
const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

export const SPARQL_URL =
  import.meta.env.VITE_SPARQL_URL ||
  (isLocalHost
    ? 'http://localhost:8890/sparql'
    : `${window.location.origin}/sparql`);
