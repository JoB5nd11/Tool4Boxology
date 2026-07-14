import { useCallback, useEffect, useRef, useState } from 'react';
import { saveSession, hasContent, type SessionSnapshot } from '../utils/sessionStorage';

type Snapshot = Omit<SessionSnapshot, 'schemaVersion' | 'savedAt'>;

const DEBOUNCE_MS = 800;

/**
 * Autosaves the editor session and guards against losing it on unload.
 *
 * Autosave and the unload guard live together because they share the dirty flag
 * and the flush-on-exit path.
 *
 * @param getSnapshot Reads the current session state. Called at write time, so
 *   it must always see fresh state (pass a ref-backed getter, not a closure over
 *   a stale render's values).
 */
export function useSessionPersistence(getSnapshot: () => Snapshot) {
  const [isDirty, setIsDirty] = useState(false);
  const [autosaveFailed, setAutosaveFailed] = useState(false);

  const timerRef = useRef<number | null>(null);
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  // beforeunload/pagehide handlers are registered once, so they read the dirty
  // flag through a ref rather than closing over a stale render's value.
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  const writeNow = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const snapshot = getSnapshotRef.current();
    // Don't overwrite a good snapshot with an empty one (e.g. right after
    // "Start fresh"); an empty session is not worth restoring anyway.
    if (!hasContent(snapshot.pages)) return;

    const result = saveSession(snapshot);
    setAutosaveFailed(!result.ok);
  }, []);

  /** Marks the session dirty and schedules a debounced write. */
  const markDirty = useCallback(() => {
    setIsDirty(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(writeNow, DEBOUNCE_MS);
  }, [writeNow]);

  /** Called after a successful export/save/KG-create — the app's save points. */
  const markSaved = useCallback(() => setIsDirty(false), []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      // Legacy browsers require a truthy returnValue to show the dialog. The
      // text itself is ignored — browsers show their own copy.
      e.returnValue = '';
    };

    // pagehide, not unload: unload is unreliable and blocked by bfcache.
    const onPageHide = () => {
      if (timerRef.current !== null) writeNow();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [writeNow]);

  return { isDirty, markDirty, markSaved, autosaveFailed };
}
