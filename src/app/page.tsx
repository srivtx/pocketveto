'use client';

/**
 * PocketVeto — single-route entry.
 * Landing at `/`, app at `/#app` (bookmarkable, back-button friendly).
 */

import { useEffect, useState } from 'react';
import { Landing } from '@/components/pocketveto/Landing';
import { PocketVetoApp } from '@/components/pocketveto/PocketVetoApp';

function isAppHash(): boolean {
  return typeof window !== 'undefined' && window.location.hash === '#app';
}

export default function Home() {
  const [route, setRoute] = useState<'landing' | 'app'>(() =>
    isAppHash() ? 'app' : 'landing'
  );

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

  if (route === 'app') {
    return (
      <PocketVetoApp
        onExit={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <Landing
      onOpenApp={() => {
        window.location.hash = 'app';
      }}
    />
  );
}
