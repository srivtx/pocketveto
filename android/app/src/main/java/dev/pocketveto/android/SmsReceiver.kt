package dev.pocketveto.android

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/**
 * SmsReceiver — optional bank-SMS capture.
 *
 * Indian banks still send a transaction SMS for every debit, which makes
 * the SMS feed the most complete payment record on the phone. This
 * receiver is inert until the user grants RECEIVE_SMS from inside the app
 * (Scan → Phone capture); Play Store policy restricts this permission
 * group, which is exactly why the app ships as a sideloaded APK with the
 * toggle honest and opt-in.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (msgs.isNullOrEmpty()) return
        val body = msgs.joinToString("") { it?.displayMessageBody.orEmpty() }
        if (body.isBlank()) return
        if (!PaymentHeuristic.looksLikePayment("", body)) return
        val sender = msgs.firstOrNull()?.originatingAddress ?: "sms"
        CaptureStore(context.applicationContext).add(
            source = "sms",
            title = sender,
            text = body,
            ts = System.currentTimeMillis(),
        )
    }
}
