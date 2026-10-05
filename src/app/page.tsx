'use client';

/**
 * PocketVeto — single-route entry.
 * Landing at `/`, app at `/#app` (bookmarkable, back-button friendly).
 * Route swaps cross-fade rather than hard-cut.
 *
 * Hydration contract: the server can never see the URL hash, so the first
 * client render MUST also render the landing (deterministic initial state).
 * The hash is read afterwards in a layout effect — it fires before the
 * browser paints, so `/#app` visitors (the PWA start URL) go straight to
 * the app with no visible flash and no hydration mismatch.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { Landing } from '@/components/pocketveto/Landing';
import { PocketVetoApp } from '@/components/pocketveto/PocketVetoApp';

/** Layout effect on the client, plain effect during SSR (no server warning). */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function isAppHash(): boolean {
  return typeof window !== 'undefined' && window.location.hash === '#app';
}

export default function Home() {
  // Deterministic: always 'landing' for the hydration pass.
  const [route, setRoute] = useState<'landing' | 'app'>('landing');

  // Post-hydration sync — runs before first paint, so no landing flash.
  useIsoLayoutEffect(() => {
    if (isAppHash()) setRoute('app');
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(isAppHash() ? 'app' : 'landing');
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline install is an enhancement — never block the app */
      });
    }
  }, []);

  return (
    <div key={route} className="pv-fade">
      {route === 'app' ? (
        <PocketVetoApp
          onExit={() => {
            window.location.hash = '';
          }}
        />
      ) : (
        <Landing
          onOpenApp={() => {
            window.location.hash = 'app';
          }}
        />
      )}
    </div>
  );
}
