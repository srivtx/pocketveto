'use client';

/**
 * PocketVeto — install button. Uses the captured beforeinstallprompt when
 * the browser offers one; otherwise tells the truth about how to install
 * (browser menu, or iOS Share → Add to Home Screen).
 */

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useInstallPrompt } from './useInstallPrompt';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS pretends to be desktop Safari — catch it too
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent));
}

export function InstallButton({ size = 'sm' }: { size?: 'sm' | 'lg' | 'default' }) {
  const { canInstall, installed, promptInstall } = useInstallPrompt();

  if (installed) return null;

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
