'use client';

/**
 * PocketVeto — install button, device-aware.
 *
 *  - inside the Android APK: nothing to install — you're in it.
 *  - Android browser: the right install is the app (it auto-detects
 *    payments), so this links straight to the latest release APK.
 *    CI re-attaches the same stable filename every release, so the link
 *    never rots.
 *  - everywhere else: the browser's own install flow (captured
 *    beforeinstallprompt), or the honest iOS path.
 *
 * The platform check flips in an effect (server render can't see the
 * UA), same shape as the standalone detection — hydration stays put.
 */

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useInstallPrompt } from './useInstallPrompt';
import { APK_LATEST_URL, isAndroidBrowser } from '@/lib/pocketveto/platform';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS pretends to be desktop Safari — catch it too
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent));
}

export function InstallButton({ size = 'sm' }: { size?: 'sm' | 'lg' | 'default' }) {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [android, setAndroid] = useState(false);
  const [inApk, setInApk] = useState(false);

  useEffect(() => {
    // async gap (house pattern): state lands outside the sync effect scope
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      setAndroid(isAndroidBrowser());
      setInApk('PocketVetoNative' in window);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (installed || inApk) return null;

  // Android browser → the app, straight from the latest release.
  if (android) {
    return (
      <Button
        onClick={() => {
          window.open(APK_LATEST_URL, '_blank', 'noopener');
          toast({
            title: 'Getting PocketVeto',
            description:
              'The APK downloads from the latest GitHub release. If Android blocks sideloading on this device, use “Install app” from the browser menu for the PWA path.',
          });
        }}
        size={size}
        variant="outline"
        className="border-ink-800 text-mist-300 hover:border-ink-700 hover:bg-ink-900 hover:text-mist-100"
      >
        <Smartphone className={size === 'lg' ? 'h-4.5 w-4.5' : 'h-4 w-4'} aria-hidden />
        Get the app
      </Button>
    );
  }

  async function handleClick() {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        toast({
          title: 'Installed',
          description: 'PocketVeto now lives on your device and works offline.',
        });
      }
      return;
    }
    toast({
      title: isIOS() ? 'Install on iPhone / iPad' : 'Install from your browser menu',
      description: isIOS()
        ? 'Tap the Share button in Safari, then "Add to Home Screen".'
        : 'Open the browser menu and pick "Install app" or "Add to Home screen".',
    });
  }

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant="outline"
      className="border-ink-800 text-mist-300 hover:border-ink-700 hover:bg-ink-900 hover:text-mist-100"
    >
      <Download className={size === 'lg' ? 'h-4.5 w-4.5' : 'h-4 w-4'} aria-hidden />
      Install app
    </Button>
  );
}
