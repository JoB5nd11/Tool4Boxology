import type { PageData, DiagramData } from '../types';

// The only module that touches localStorage. Swapping to IndexedDB later
// (if diagrams outgrow the ~5MB quota) should not require changes elsewhere.

export const SESSION_KEY = 't4b:session:v1';
export const SCHEMA_VERSION = 1;

export type SessionSnapshot = {
  schemaVersion: number;
  savedAt: number;
  pages: PageData[];
  currentPageId: string;
  containers: string[];
  customContainerShapes: Record<string, DiagramData[]>;
  customGroups: Record<string, DiagramData[]>;
};

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'error' };

const isQuotaError = (err: unknown) =>
  err instanceof DOMException &&
  // Safari reports quota failures under a different name/code than Chrome/Firefox.
  (err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014);

/**
 * Returns null for a missing key, unparseable JSON, or an unrecognized
 * schemaVersion, so a corrupt or future snapshot degrades to a blank canvas.
 */
export function loadSession(): SessionSnapshot | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null; // storage disabled (private mode, blocked cookies)
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) return null;
    if (typeof parsed.currentPageId !== 'string') return null;

    return {
      schemaVersion: parsed.schemaVersion,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      pages: parsed.pages,
      currentPageId: parsed.currentPageId,
      containers: Array.isArray(parsed.containers) ? parsed.containers : ['General', 'Annotation'],
      customContainerShapes: parsed.customContainerShapes ?? {},
      customGroups: parsed.customGroups ?? {},
    };
  } catch {
    return null;
  }
}

export function saveSession(snapshot: Omit<SessionSnapshot, 'schemaVersion' | 'savedAt'>): SaveResult {
  const payload: SessionSnapshot = {
    ...snapshot,
    schemaVersion: SCHEMA_VERSION,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: isQuotaError(err) ? 'quota' : 'error' };
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // nothing useful to do; a failed clear is not data loss
  }
}

/** A session with no nodes on any page is not worth restoring. */
export function hasContent(pages: PageData[]): boolean {
  return pages.some((p) => (p.nodeDataArray?.length ?? 0) > 0);
}
