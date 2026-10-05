'use client';

/**
 * PocketVeto — install prompt.
 *
 * Captures the browser's beforeinstallprompt so our own button can offer
 * installation at a sensible moment, and knows when the app already runs
 * installed (standalone display mode). iOS Safari never fires the event —
 * there we show the honest path (Share → Add to Home Screen) instead.
 *
 * Standalone mode is read through useSyncExternalStore (the canonical
 * external-store subscribe — no state is set inside effects).
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function subscribeStandalone(onChange: () => void): () => void {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    () => window.matchMedia('(display-mode: standalone)').matches,
    () => false
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  return { canInstall: deferred !== null && !standalone, installed: standalone, promptInstall };
}
