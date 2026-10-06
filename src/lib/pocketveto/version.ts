/**
 * PocketVeto — version constant (web layer).
 *
 * Kept in lockstep with package.json and android/app/build.gradle.kts
 * (versionName). Inside the APK the native bridge reports its own
 * BuildConfig.VERSION_NAME — Settings shows that when present, so the
 * app can always prove which build it is.
 */
export const APP_VERSION = '1.5.3';
