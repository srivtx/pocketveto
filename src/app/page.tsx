'use client';

/**
 * PocketVeto — single-route entry.
 * Landing at `/`, app at `/#app` (bookmarkable, back-button friendly).
 * Route swaps cross-fade rather than hard-cut.
 *
 * Hydration contract: the server can never see the URL hash or query, so
 * the first client render MUST also render the landing (deterministic
 * initial state). Both are read afterwards in a layout effect — it fires
 * before the browser paints, so `/#app` visitors (the PWA start URL) and
 * share-target visitors go straight where they're headed with no visible
 * flash and no hydration mismatch.
 *
 * In-page navigation note: landing sections scroll via scrollIntoView
 * WITHOUT touching the hash — the hash belongs to the route, and every
 * hashchange that doesn't change the route must not scroll.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Landing } from '@/components/pocketveto/Landing';
import { PocketVetoApp } from '@/components/pocketveto/PocketVetoApp';

/** Layout effect on the client, plain effect during SSR (no server warning). */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Route = 'landing' | 'app';

function readIntent(): { route: Route; sharedText: string } {
  if (typeof window === 'undefined') return { route: 'landing', sharedText: '' };
  // Web Share Target: the OS share sheet opens /?text=… (GET form). Read it,
  // then rewrite the URL to the app route — replaceState fires no events.
  const params = new URLSearchParams(window.location.search);
  const shared = (params.get('text') ?? params.get('title') ?? '').trim();
  if (shared) {
    window.history.replaceState(null, '', `${window.location.pathname}#app`);
    return { route: 'app', sharedText: shared };
  }
  // Inside the Android APK the bridge exists — and a phone app should open
  // like an app, not on a marketing page. First run shows the skippable
  // tutorial (Welcome) instead of the landing hero.
  if ('PocketVetoNative' in window) {
    return { route: 'app', sharedText: '' };
  }
  return { route: window.location.hash === '#app' ? 'app' : 'landing', sharedText: '' };
}

export default function Home() {
  // Deterministic: always 'landing' for the hydration pass.
  const [route, setRoute] = useState<Route>('landing');
  const [sharedText, setSharedText] = useState('');

  // Post-hydration sync — runs before first paint, so no landing flash.
  useIsoLayoutEffect(() => {
    const intent = readIntent();
    setRoute(intent.route);
    setSharedText(intent.sharedText);
  }, []);

  useEffect(() => {
    const onHash = () => {
      // Only the route owns the hash. Section scrolls never touch it, and a
      // hashchange that doesn't change the route must not yank the page.
      const next: Route = window.location.hash === '#app' ? 'app' : 'landing';
      setRoute((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Scroll to top exactly once per real route change — never on in-page scrolls.
  const lastRoute = useRef<Route>('landing');
  useEffect(() => {
    if (lastRoute.current !== route) {
      lastRoute.current = route;
      window.scrollTo({ top: 0 });
    }
  }, [route]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline install is an enhancement — never block the app */
      });
    }
  }, []);

  return (
    <div key={route} className="pv-scene">
      {route === 'app' ? (
        <PocketVetoApp
          sharedText={sharedText}
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
