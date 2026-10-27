import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmEngine } from "./engine";
import { useAi } from "./store";

/**
 * Get a ready engine, asking for download consent first when needed.
 * `withEngine(fn)` resolves once the user accepted and the model loaded.
 */
export function useLocalAi() {
  const detect = useAi((s) => s.detect);
  const availability = useAi((s) => s.availability);
  const status = useAi((s) => s.status);
  const [consentOpen, setConsentOpen] = useState(false);
  const pending = useRef<{ resolve: (e: LlmEngine) => void; reject: (e: unknown) => void } | null>(null);

  useEffect(() => {
    if (!availability) void detect();
  }, [availability, detect]);

  const getEngine = useCallback((): Promise<LlmEngine> => {
    const { status, resolve, load } = useAi.getState();
    if (status.kind === "ready") return Promise.resolve(status.engine);
    const choice = resolve();
    if (!choice) return Promise.reject(new Error("unsupported"));
    if (!choice.needsDownload) return load();
    return new Promise((res, rej) => {
      pending.current = { resolve: res, reject: rej };
      setConsentOpen(true);
    });
  }, []);

  const consent = {
    open: consentOpen,
    onOpenChange: (open: boolean) => {
      setConsentOpen(open);
      if (!open && pending.current) {
        pending.current.reject(new DOMException("Declined", "AbortError"));
        pending.current = null;
      }
    },
    onAccept: () => {
      const p = pending.current;
      pending.current = null;
      setConsentOpen(false);
      if (p) useAi.getState().load().then(p.resolve, p.reject);
    },
  };

  const supported = availability ? availability.chrome !== "unsupported" || availability.webllm !== "unsupported" : null;
  return { getEngine, consent, status, supported };
}
