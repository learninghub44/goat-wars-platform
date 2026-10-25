import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Debate } from '../types';

const POLL_MS = 20_000;

export function useDebates() {
  const [debates, setDebates] = useState<Debate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async (fresh = false) => {
    try {
      const r = await api.debates(fresh);
      setDebates(r.debates);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    timer.current = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  return { debates, error, reload: () => load(true) };
}
