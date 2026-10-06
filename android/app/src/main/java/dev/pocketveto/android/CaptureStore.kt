package dev.pocketveto.android

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * CaptureStore — the on-device queue of raw payment-like captures.
 *
 * What it holds: the RAW text of a captured payment notification (plus
 * source package, sender title and a timestamp). Nothing is parsed here,
 * nothing is uploaded anywhere — parsing happens in the WebView layer with
 * the app's tested detector, and every byte stays inside the app sandbox.
 *
 * Dedup rule: same source + same text on the same day is one capture.
 * The queue is capped (60) and drops the oldest when full.
 */
class CaptureStore(context: Context) {

    private val prefs =
        context.getSharedPreferences("pv_captures", Context.MODE_PRIVATE)

    companion object {
        private const val KEY = "queue"
        private const val BIND_KEY = "lastBindTs"
        private const val CAP = 60
        private const val DAY_MS = 86_400_000L
    }

    /**
     * Epoch ms of the last moment the system actually BOUND the payment
     * listener (0 = never). The bridge compares this against the app's
     * install time: Android documents a behavior where updating an app
     * silently unbinds a granted NotificationListenerService — the toggle
     * can stay "on" while no notification is ever delivered again. A stale
     * timestamp is exactly that state, and is what triggers the re-bind.
     */
    fun lastBindTs(): Long = prefs.getLong(BIND_KEY, 0L)

    /** Called from PaymentListenerService.onListenerConnected — the only
     *  proof that captures are really flowing. */
    fun markListenerBound() {
        prefs.edit().putLong(BIND_KEY, System.currentTimeMillis()).commit()
    }

    private fun read(): JSONArray {
        val raw = prefs.getString(KEY, null) ?: return JSONArray()
        if (raw.isBlank()) return JSONArray()
        // fail soft: a corrupt queue reads as empty, never crashes the service
        return try {
            JSONArray(raw)
        } catch (e: org.json.JSONException) {
            JSONArray()
        }
    }

    private fun write(arr: JSONArray) {
        prefs.edit().putString(KEY, arr.toString()).commit()
    }

    /** Offer one capture. Returns false if it was a duplicate. */
    @Synchronized
    fun add(source: String, title: String, text: String, ts: Long): Boolean {
        val arr = read()
        val day = ts / DAY_MS
        val norm = text.trim().lowercase().take(160)
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val sameDay = o.optLong("ts", 0L) / DAY_MS == day
            if (sameDay &&
                o.optString("source") == source &&
                o.optString("text").trim().lowercase().take(160) == norm
            ) return false
        }
        val entry = JSONObject()
            .put("source", source)
            .put("title", title)
            .put("text", text)
            .put("ts", ts)
        arr.put(entry)
        while (arr.length() > CAP) arr.remove(0)
        write(arr)
        return true
    }

    @Synchronized
    fun count(): Int = read().length()

    /** Hand everything to the web layer and clear the queue. */
    @Synchronized
    fun drainJson(): String {
        val arr = read()
        write(JSONArray())
        return arr.toString()
    }
}

/**
 * A deliberately permissive money pre-filter. Its only job is to keep
 * obvious junk (chats, news, promo blasts without money strings) out of
 * the queue — the real gating (OTP/promo rejection, verb rules, amount
 * parsing) happens in the web layer's tested detector.
 */
object PaymentHeuristic {
    private val MONEY = Regex("""(₹|Rs\.?|INR|USD?\b|\$\s*\d|\d+\s*(?:USD|INR|rs))""", RegexOption.IGNORE_CASE)
    private val VERB =
        Regex("""\b(paid|pay|payment|sent|debited|credited|charged|received|purchased|autopay|auto-?pay|renewed|renewal|subscription)\b""", RegexOption.IGNORE_CASE)

    fun looksLikePayment(title: String, body: String): Boolean {
        val t = "$title $body"
        return MONEY.containsMatchIn(t) && VERB.containsMatchIn(t)
    }
}
