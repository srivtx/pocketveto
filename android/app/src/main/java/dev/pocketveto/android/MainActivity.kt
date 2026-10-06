package dev.pocketveto.android

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
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

        /** Opens the system "Notification access" settings page. */
        @JavascriptInterface
        fun openNotifAccess() {
            runOnUiThread {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }

    }
}
