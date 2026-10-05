/**
 * platform.ts — where am I running?
 *
 * Three contexts matter, and each gets a different install story:
 *  - the Android APK (window.PocketVetoNative exists): no install UI at
 *    all — you are already in the app;
 *  - a plain Android browser: the right install is the APK from the
 *    latest GitHub Release (auto-detects payments), so buttons link
 *    straight to it — a stable filename the CI re-attaches every release;
 *  - desktop / iOS / installed PWA: the browser's own install flow
 *    (beforeinstallprompt / Add to Home Screen), exactly as before.
 *
 * All checks are client-only — components gate them behind effects or
 * hydration-safe state so the server render never depends on the UA.
 */

export const APK_LATEST_URL =
  'https://github.com/srivtx/pocketveto/releases/latest/download/PocketVeto-android.apk';

export const RELEASES_URL = 'https://github.com/srivtx/pocketveto/releases';

export function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!/android/i.test(navigator.userAgent)) return false;
  // Inside the APK the bridge exists — that's not "install", that's home.
  return !getNativePresent();
}

export function getNativePresent(): boolean {
  if (typeof window === 'undefined') return false;
  return 'PocketVetoNative' in window;
}
