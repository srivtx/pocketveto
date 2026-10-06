package dev.pocketveto.android

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * PaymentListenerService — the auto-detect engine.
 *
 * When the user grants "Notification access" (a special-app-access switch
 * in system settings — no scary permission prompts, and it can be revoked
 * any time), Android hands every posted notification to this service.
 *
 * This service is a pure capture head: it keeps only notifications that
 * look like money movement (PhonePe, GPay, Paytm, banks, card apps…),
 * stores the raw text in [CaptureStore], and the PocketVeto web layer
 * parses it with the same detector that powers the statement scanner.
 * Nothing ever leaves the device.
 */
class PaymentListenerService : NotificationListenerService() {

    override fun onListenerConnected() {
        // The system is really handing us notifications right now — record
        // the moment. The bridge compares this against the app's install
        // time: when Android silently unbinds a granted listener after an
        // app update (documented, much-hated behavior — the settings toggle
        // can even stay "on" while nothing is delivered), this timestamp
        // goes stale and MainActivity re-requests the binding the next time
        // the app comes to the front.
        CaptureStore(applicationContext).markListenerBound()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (pkg == applicationContext.packageName) return
        val n = sbn.notification ?: return

        // Group summaries duplicate their children — skip them.
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val extras = n.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        // Expanded bodies carry the full transaction line.
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val body = bigText.ifBlank { text }
        if (body.isBlank() && title.isBlank()) return

        if (!PaymentHeuristic.looksLikePayment(title, body)) return

        CaptureStore(applicationContext).add(
            source = pkg,
            title = title,
            text = if (body.isBlank()) title else body,
            ts = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis(),
        )
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        /* captures are kept — removal of a notification means nothing here */
    }

    override fun onListenerDisconnected() {
        /* Nothing to clean: the queue persists, and the re-bind logic lives
           in MainActivity (it runs whenever the app returns to the front).
           The last-bind timestamp is deliberately NOT cleared — it is the
           evidence the bridge compares against the app's install time. */
    }
}
