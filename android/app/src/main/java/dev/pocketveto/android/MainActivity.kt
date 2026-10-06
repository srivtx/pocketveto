package dev.pocketveto.android

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * MainActivity — a thin native shell around the bundled PocketVeto web
 * app (built with `NEXT_STATIC=1` into assets/web).
 *
 * The web layer is served through WebViewAssetLoader over the virtual
 * https origin https://appassets.androidplatform.net/ — a real origin, so
 * IndexedDB persistence and the PWA behave exactly like on the web. No
 * network is ever touched: the loader answers every request from the
 * bundled assets.
 *
 * The app opens straight into the app view (`#app`), not the landing
 * page — on a phone, PocketVeto should behave like an app, not a site.
 * The first-run tutorial (web layer) handles the intro, skippably.
 *
 * The bridge (window.PocketVetoNative) exposes the capture engine to the
 * web layer: drained captures, permission state, and the switch to the
 * notification-access settings screen. v1.4.1 dropped the optional SMS
 * receiver entirely: its permission group is what made Play Protect
 * hard-block the install with an identity-fraud warning no user should
 * have to fight through. Notifications alone cover the payment feeds.
 *
 * v1.4.4 adds the alerts half of the bridge. The Web Notification API is
 * dead inside a bare WebView (Chromium auto-denies permission — there is
 * no browser UI to grant it), so "Turn on alerts" in the web settings ran
 * into a wall: it can never be granted, and the app never shows up as a
 * notification-posting app. The honest fix is native: the bridge asks the
 * Android 13+ POST_NOTIFICATIONS runtime prompt, posts real notifications
 * on the "alerts" channel, and deep-links to this app's own notification
 * settings. All framework APIs — zero new gradle dependencies.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    private val assetDomain = "appassets.androidplatform.net"
    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .setDomain(assetDomain)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        webView.setBackgroundColor(0xFF030907.toInt())

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // IndexedDB + localStorage — the app's whole store
            allowFileAccess = false // everything arrives via the asset loader
            allowContentAccess = false
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
        }

        webView.addJavascriptInterface(NativeBridge(), "PocketVetoNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?,
            ): WebResourceResponse? {
                request?.url?.let { return assetLoader.shouldInterceptRequest(it) }
                return null
            }
        }

        setContentView(webView)

        // The export's own references are root-absolute ("/_next/…",
        // "/manifest.webmanifest", "/icons/…"), so the AssetsPathHandler
        // registered at "/" must serve them from the ASSETS ROOT — the
        // build bundles out/ directly into android/app/src/main/assets/.
        // "/" itself has no directory-index in WebViewAssetLoader: always
        // ask for the real document (v1.4.1 asked for "/" and got the 404
        // "webpage not available" page — the blank-screen bug).
        webView.loadUrl("https://$assetDomain/index.html#app")
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    /* ---------------- listener life support ---------------- */

    /** Epoch ms when THIS app version was installed — every sideloaded
     *  update bumps it. Compare with CaptureStore.lastBindTs() to detect
     *  the silent unbind below. */
    private fun lastUpdateTime(): Long =
        packageManager.getPackageInfo(packageName, 0).lastUpdateTime

    /** True when the user's grant exists AND the listener has actually
     *  been bound at least once since the current app version was
     *  installed — the only honest definition of "captures are flowing". */
    private fun listenerAlive(): Boolean =
        notifAccessGranted() && CaptureStore(this).lastBindTs() >= lastUpdateTime()

    /**
     * THE fix for "the OS removes it": Android documents that updating an
     * app silently unbinds — and on many builds disables — a granted
     * NotificationListenerService (force-stops and aggressive OEM battery
     * policies do the same). The settings toggle can even stay "on" while
     * nothing is ever delivered again, so it looks like the permission
     * keeps vanishing on its own.
     *
     * The system-provided escape is NotificationListenerService.requestRebind:
     * with the user's grant still on record it re-enables and re-binds the
     * component with no user action and no prompts. Called every time the
     * app comes to the front — a no-op when the binding is already current,
     * the fix when it isn't. Runs even when this activity has no UI yet.
     */
    private fun maybeRebindListener() {
        if (!notifAccessGranted()) return // nothing to rebind — the honest
        // off state is handled by the settings deep-link, never by nagging.
        if (listenerAlive()) return // binding is current — nothing to do.
        try {
            NotificationListenerService.requestRebind(
                ComponentName(this, PaymentListenerService::class.java)
            )
        } catch (_: Exception) {
            // fail soft: the deep-link path in settings still works.
        }
    }

    override fun onResume() {
        super.onResume()
        maybeRebindListener()
    }

    /* ---------------- alert plumbing ---------------- */

    companion object {
        private const val ALERT_CHANNEL_ID = "alerts"
        private const val ALERT_REQ_CODE = 4047
        /** The signal-400 accent from the web design system, as ARGB. */
        private const val ALERT_COLOR = 0xFF2EBB8B.toInt()
    }

    /** The channel the app's OWN reminders post on (created lazily). */
    private fun ensureAlertChannel() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(ALERT_CHANNEL_ID) != null) return
        nm.createNotificationChannel(
            NotificationChannel(
                ALERT_CHANNEL_ID,
                "Money-date reminders",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "T-7, T-2 and day-of warnings before a charge moves"
            },
        )
    }

    /** True when the OS would let this app post (runtime prompt + user toggle). */
    private fun postsAllowed(): Boolean {
        return if (Build.VERSION.SDK_INT >= 33) {
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        } else {
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .areNotificationsEnabled()
        }
    }

    /** Runs after the POST_NOTIFICATIONS dialog — nothing to do: the web
     *  layer re-polls alertsEnabled() when the window regains focus. */
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }

    /** Posts a real system notification. Safe off the UI thread (binder call). */
    private fun postSystemNotification(title: String, body: String): Boolean {
        if (!postsAllowed()) return false
        ensureAlertChannel()
        val n = Notification.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setColor(ALERT_COLOR)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .build()
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(title.hashCode(), n)
        return true
    }

    /** Back navigates the web history before leaving the app. */
    @Deprecated("Deprecated in Java")
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    /* ---------------- permission plumbing ---------------- */

    private fun notifAccessGranted(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
            ?: return false
        return flat.split(':').any { entry ->
            val cn = ComponentName.unflattenFromString(entry) ?: return@any false
            cn.packageName == packageName
        }
    }

    /* ---------------- the JS bridge ---------------- */

    /** Careful: every method here runs on the JS bridge thread, not the UI
     *  thread — UI work hops over with runOnUiThread. */
    inner class NativeBridge {

        @JavascriptInterface
        fun version(): String = BuildConfig.VERSION_NAME

        /** How many raw captures are waiting. */
        @JavascriptInterface
        fun captureCount(): Int = CaptureStore(this@MainActivity).count()

        /** Drain all captures as a JSON array string. */
        @JavascriptInterface
        fun takeCaptured(): String = CaptureStore(this@MainActivity).drainJson()

        @JavascriptInterface
        fun notifEnabled(): Boolean = notifAccessGranted()

        /** v1.5.3: grant exists AND the listener has actually been bound
         *  since the current app version was installed. A granted-but-dead
         *  listener (the silent OS unbind) reads false — the web layer then
         *  offers a one-tap wake instead of sending the user to settings. */
        @JavascriptInterface
        fun notifAlive(): Boolean = listenerAlive()

        /** v1.5.3: manual wake. True = the grant is on record and a rebind
         *  was requested (the state settles asynchronously — the web layer
         *  re-polls). False = the switch itself is off: the only honest fix
         *  is the system settings screen, never a rebind. */
        @JavascriptInterface
        fun rebindCapture(): Boolean {
            if (!notifAccessGranted()) return false
            try {
                // `this` inside this inner class is the BRIDGE, not the
                // activity — the component must name the activity's package.
                NotificationListenerService.requestRebind(
                    ComponentName(this@MainActivity, PaymentListenerService::class.java)
                )
            } catch (_: Exception) {
                // the request may still have landed — report attempted.
            }
            return true
        }

        /** Opens the system "Notification access" settings page. */
        @JavascriptInterface
        fun openNotifAccess() {
            runOnUiThread {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }

        /** True when this app's own reminders can post (user toggle + runtime grant). */
        @JavascriptInterface
        fun alertsEnabled(): Boolean = postsAllowed()

        /** Fires the Android 13+ "allow notifications" runtime prompt for
         *  this app's own alerts (the Web Notification API cannot ask from
         *  inside a WebView — this is its native replacement). */
        @JavascriptInterface
        fun requestAlerts() {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= 33 &&
                    checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) !=
                        PackageManager.PERMISSION_GRANTED
                ) {
                    requestPermissions(
                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                        ALERT_REQ_CODE,
                    )
                }
            }
        }

        /** Posts one real system notification. Returns false when blocked. */
        @JavascriptInterface
        fun postAlert(title: String, body: String): Boolean =
            postSystemNotification(title, body)

        /** Deep-links to this app's own notification settings (channel list). */
        @JavascriptInterface
        fun openAlertSettings() {
            runOnUiThread {
                val i = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                startActivity(i)
            }
        }

    }
}
