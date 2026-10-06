'use client';

/**
 * PocketVeto — settings (data controls).
 *
 * v1.4.4 layout: settings rebuilt clean. The v1.4.3 rows put label+support
 * left and a shrink-0 control cluster right on one line — on a 390px phone
 * that squeezed the text column to ~150px and the copy crumbled into tall
 * word-stacks ("the cards are crunched and texts get so bad"). The fix is
 * structural: rows stack on phones (title, support, then a full-width
 * control line) and only go side-by-side from `sm` up. Sections wear the
 * canvas-style micro-label OUTSIDE a solid card — calmer than in-card
 * headers, and the solid plate reads cleaner over the app background than
 * the old translucent fill.
 *
 * v1.5.0: the victory-lap SavedView moved into ItemsView as a "Saved"
 * filter (the tab bar's fifth cell now belongs to Payments), and the data
 * rows count the payments ledger alongside the radar items.
 *
 * The notification story is honest: two DIFFERENT system screens exist and
 * the rows say exactly which one to use —
 *  - "Notification access" (Special app access) feeds autopay detection.
 *  - The app's own notification channel (Android 13+ POST_NOTIFICATIONS)
 *    feeds reminder alerts — asked natively, because the Web Notification
 *    API cannot be granted inside a WebView.
 */

import { useRef, useState } from 'react';
import {
  Check,
  CircleAlert,
  Download,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { MoneyDateItem } from '@/lib/pocketveto/types';
import { formatMoney } from '@/lib/pocketveto/risk';
import { permissionState, requestPermission, fireNotification } from '@/lib/pocketveto/notifications';
import {
  getNativeBridge,
  requestListenerRebind,
  type NativeStatusLive,
} from '@/lib/pocketveto/native';
import { runDetectionSelfTest, type SelfTestResult } from '@/lib/pocketveto/selftest';
import { APP_VERSION } from '@/lib/pocketveto/version';
import { toast } from '@/hooks/use-toast';
import { replayIntro } from './Welcome';

/* ------------------------------------------------------------------ */
/* Settings building blocks — the clean canvas-style kit.               */

/** Section micro-label, sitting OUTSIDE the card (canvas-style grouping). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pv-label px-1 pb-2.5 pt-1.5 sm:px-1.5">{children}</h3>
  );
}

/** A settings card: one solid plate, hairline border, divided rows. */
function Section({
  label,
  danger = false,
  children,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div
        className={`overflow-hidden rounded-2xl border ${
          danger ? 'border-cliff-400/25' : 'border-ink-800'
        } bg-ink-925`}
      >
        <div className="divide-y divide-ink-800/60">{children}</div>
      </div>
    </section>
  );
}

/**
 * One settings row. Phones: title → support → control line, stacked (the
 * control never squeezes the text). `sm` and up: side-by-side, controls
 * right. This is the structural fix for the v1.4.3 crunched rows.
 */
function Row({
  title,
  support,
  children,
}: {
  title: string;
  support?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug text-mist-100">{title}</p>
          {support && (
            <p className="mt-1 text-[13px] leading-relaxed text-mist-500">{support}</p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/** Status chip — the one word the row is really about. */
function Chip({ tone, children }: { tone: 'on' | 'off' | 'neutral'; children: React.ReactNode }) {
  const tones = {
    on: 'border-signal-500/40 bg-signal-400/15 text-signal-300',
    off: 'border-warn-400/40 bg-warn-400/10 text-warn-300',
    neutral: 'border-ink-700 bg-ink-900 text-mist-400',
  } as const;
  return (
    <Badge variant="outline" className={`px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </Badge>
  );
}

const outlineBtn =
  'border-ink-800 bg-ink-900/60 text-mist-200 hover:bg-ink-850 hover:text-mist-100';
const solidBtn = 'bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300';

/* ------------------------------------------------------------------ */

export function SettingsView({
  items,
  paymentsCount = 0,
  native,
  onExport,
  onImport,
  onClearAll,
  onLoadSample,
  onGoScan,
}: {
  items: MoneyDateItem[];
  /** Ledger size for the data rows (v1.5.0). */
  paymentsCount?: number;
  /** Native capture engine status — present only inside the Android APK. */
  native?: NativeStatusLive;
  onExport: () => string;
  onImport: (raw: string) => { imported: number; skipped: number };
  onClearAll: () => void;
  onLoadSample: () => void;
  /** Jump to the Scan tab (from "review captures"). */
  onGoScan?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [perm, setPerm] = useState(permissionState);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [selfTest, setSelfTest] = useState<SelfTestResult | null>(null);
  const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);

  const inApp = Boolean(native?.available);
  const notifOn = Boolean(native?.notifEnabled);
  /** Granted AND actually bound since this app version was installed —
   *  Android silently unbinds listeners after app updates, so "on" alone
   *  stopped being honest proof that captures are flowing. */
  const notifLive = Boolean(native?.notifEnabled && native?.notifAlive);
  /** Alerts truth: native bridge inside the APK, web permission outside. */
  const alertsOn = inApp ? Boolean(native?.alertsEnabled) : perm === 'granted';

  function loadSample() {
    // Sample data replaces everything — ask first if real items exist.
    if (items.length > 0) {
      setConfirmSample(true);
      return;
    }
    onLoadSample();
  }

  async function askPermission() {
    if (inApp) {
      // Native: fires the Android 13+ POST_NOTIFICATIONS runtime prompt.
      // The answer lands when the window regains focus (native refresh).
      getNativeBridge()?.requestAlerts();
      toast({
        title: 'Waiting for the system prompt',
        description: 'Allow notifications for PocketVeto in the dialog — the row updates when you return.',
      });
      return;
    }
    const result = await requestPermission();
    setPerm(result);
    if (result === 'granted') {
      toast({ title: 'Alerts on', description: 'T-7, T-2 and day-of notifications are live while PocketVeto can run.' });
    }
  }

  function sendTestAlert() {
    const b = getNativeBridge();
    if (inApp && b) {
      let posted = false;
      try {
        posted = typeof b.postAlert === 'function' && b.postAlert(
          'PocketVeto — T-7 warning',
          'Netflix renews in 7 days. ₹649 will move unless you veto it. (This is a test alert.)'
        );
      } catch {
        posted = false;
      }
      if (!posted) {
        toast({
          title: 'Alerts are blocked',
          description: 'Android is blocking PocketVeto notifications. Use the row below to open the app notification settings and turn them on.',
        });
        return;
      }
      toast({ title: 'Test alert sent', description: 'Check your notification shade — that is the T-7 shape.' });
      return;
    }
    if (perm !== 'granted') return;
    fireNotification(
      'PocketVeto — T-7 warning',
      'Netflix renews in 7 days. ₹649 will move unless you veto it. (This is a test alert.)'
    );
    toast({ title: 'Test alert sent', description: 'Check your notification shade — that is the T-7 shape.' });
  }

  function runSelfTest() {
    const result = runDetectionSelfTest();
    setSelfTest(result);
    try {
      setBridgeVersion(getNativeBridge()?.version() ?? null);
    } catch {
      setBridgeVersion(null);
    }
    toast({
      title: result.passed ? 'Detection self-test passed' : 'Self-test found a problem',
      description: result.summary,
    });
  }

  /** Wake the granted-but-unbound listener (the post-update unbind).
      One tap asks the system to re-bind; the row settles when the
      listener reconnects and the status poll picks it up. */
  function wakeCapture() {
    const b = getNativeBridge();
    if (!b) return;
    if (requestListenerRebind(b) === 'switch-off') {
      // The switch itself is off (or the bridge predates rebindCapture) —
      // the system screen is the only honest fix. Deep-link and say so.
      try {
        b.openNotifAccess();
      } catch {
        /* fail soft */
      }
      toast({
        title: 'The switch is off',
        description:
          'In system settings, find PocketVeto in the Notification access list and turn its toggle on — that one switch feeds detection.',
      });
      return;
    }
    toast({
      title: 'Waking capture',
      description:
        'Asking Android to re-bind the engine. This row flips back to live the moment the system reconnects it — usually a second.',
    });
    setTimeout(() => native?.refresh(), 700);
    setTimeout(() => native?.refresh(), 1800);
  }

  function download() {
    const blob = new Blob([onExport()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pocketveto-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Your money dates are in that JSON file. Keep it anywhere.' });
  }

  async function upload(file: File) {
    const text = await file.text();
    const result = onImport(text);
    if (result.imported > 0) {
      toast({
        title: `Imported ${result.imported} item${result.imported > 1 ? 's' : ''}`,
        description: result.skipped ? `${result.skipped} entries skipped (unrecognized).` : undefined,
      });
    } else {
      toast({ title: 'Nothing imported', description: 'No valid PocketVeto items found in that file.' });
    }
  }

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-6">
      {/* ---------------- Autopay detection ---------------- */}
      <Section label="Autopay detection">
        {inApp ? (
          <>
            <Row
              title="Notification access"
              support={
                notifLive
                  ? 'Live — payment notifications from PhonePe, GPay, Paytm, banks and card apps are being captured on this phone. PocketVeto also re-binds the engine on its own every time you open the app, so an OS unbind never silently stops detection.'
                  : notifOn
                    ? "The switch is on, but Android unbound the engine — it does this after every app update (and after force-stops or battery sweeps), while the toggle can stay on. Nothing is lost: Wake re-binds it in one tap, and PocketVeto also tries automatically each time you open the app. If Wake doesn't stick, some OEM battery managers (MIUI 'Autostart', Samsung 'Sleeping apps') are holding it — set PocketVeto to unrestricted there."
                    : "The one switch that feeds detection. Open system settings, find PocketVeto in the list, turn its toggle ON. Stock Android calls this screen 'Notification access' (Settings → Special app access); Samsung calls it 'Device & app notifications'. The app stays fully usable without it — Paste and Share keep working."
              }
            >
              {notifLive ? (
                <Chip tone="on">On · live</Chip>
              ) : notifOn ? (
                <>
                  <Chip tone="off">On · idle</Chip>
                  <Button size="sm" className={solidBtn} onClick={wakeCapture}>
                    <Zap className="h-4 w-4" aria-hidden /> Wake capture
                  </Button>
                </>
              ) : (
                <>
                  <Chip tone="off">Off</Chip>
                  <Button
                    size="sm"
                    className={solidBtn}
                    onClick={() => getNativeBridge()?.openNotifAccess()}
                  >
                    Open system settings
                  </Button>
                </>
              )}
            </Row>
            <Row
              title="Captures waiting"
              support="Payment notifications captured on this phone, parsed the moment you review them."
            >
              <span className="pv-num text-sm font-semibold text-mist-200">
                {native?.pendingCount ?? 0}
              </span>
              {(native?.pendingCount ?? 0) > 0 && onGoScan && (
                <Button size="sm" className={outlineBtn} onClick={onGoScan}>
                  Review in Scan
                </Button>
              )}
            </Row>
          </>
        ) : (
          <Row
            title="Notification capture"
            support="Automatic capture needs the Android app — this is the browser build. The parser below still proves itself here."
          >
            <Chip tone="neutral">App only</Chip>
          </Row>
        )}

        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-snug text-mist-100">Detection self-test</p>
              <p className="mt-1 text-[13px] leading-relaxed text-mist-500">
                Runs the real parser over sample payment notifications — PhonePe, Paytm, bank
                SMS, plus promo/OTP junk it must reject. On this device, in a heartbeat.
              </p>
            </div>
            <Button size="sm" className={`${outlineBtn} sm:shrink-0`} onClick={runSelfTest}>
              <ScanLine className="h-3.5 w-3.5" aria-hidden /> Run self-test
            </Button>
          </div>

          {selfTest && (
            <ul className="pv-rise mt-4 space-y-2 border-t border-ink-800/60 pt-4">
              {selfTest.checks.map((c) => (
                <li key={c.name} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                  {c.passed ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-400" strokeWidth={2} aria-hidden />
                  ) : (
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cliff-400" strokeWidth={2} aria-hidden />
                  )}
                  <span className="text-mist-300">
                    {c.name}
                    <span className="text-mist-500"> — {c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* ---------------- Alerts ---------------- */}
      <Section label="Alerts">
        <Row
          title="Reminder alerts"
          support={
            inApp
              ? 'T-7, T-2 and day-of warnings before a charge moves. Android asks once with a system prompt — allow notifications for PocketVeto and every alert after that is silent business as usual. No push server exists; everything stays on-device.'
              : 'T-7, T-2 and day-of while PocketVeto is open or its background worker can run. No push server exists — everything stays on-device.'
          }
        >
          {alertsOn ? (
            <>
              <Chip tone="on">On</Chip>
              <Button size="sm" className={outlineBtn} onClick={sendTestAlert}>
                Send test alert
              </Button>
            </>
          ) : (
            <Button size="sm" className={solidBtn} onClick={askPermission}>
              Turn on alerts
            </Button>
          )}
        </Row>
        {inApp && (
          <Row
            title="App notification settings"
            support="Android's own screen for this app — the channel the reminders post on, its sound and importance, and the master PocketVeto toggle."
          >
            <Button
              size="sm"
              className={outlineBtn}
              onClick={() => getNativeBridge()?.openAlertSettings()}
            >
              Open Android settings
            </Button>
          </Row>
        )}
        <Row title="Replay the intro" support="The three-step walkthrough from your first launch, any time.">
          <Button size="sm" className={outlineBtn} onClick={replayIntro}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Replay
          </Button>
        </Row>
      </Section>

      {/* ---------------- Data ---------------- */}
      <Section label="Your data">
        <Row
          title="Stored on this device"
          support={`${items.length} item${items.length === 1 ? '' : 's'} on your radar and ${paymentsCount} payment${paymentsCount === 1 ? '' : 's'} in the ledger. Export moves devices; import merges (existing ids are kept).`}
        >
          <span className="pv-num text-sm font-semibold text-mist-200">
            {items.length} · {paymentsCount}
          </span>
          <Button size="sm" className={outlineBtn} onClick={download}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export
          </Button>
          <Button size="sm" className={outlineBtn} onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
        </Row>
        <Row
          title="Demo data"
          support="Load a sample radar, ledger and totals across every kind to see the whole app lit up."
        >
          <Button size="sm" className={outlineBtn} onClick={loadSample}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Load sample
          </Button>
        </Row>
      </Section>

      {/* ---------------- Danger zone ---------------- */}
      <Section label="Danger zone" danger>
        <Row
          title="Erase everything"
          support="Deletes every item and every payment on this device. There is no cloud copy — that's the point."
        >
          <Button
            size="sm"
            className="border-cliff-400/40 bg-transparent text-cliff-300 hover:bg-cliff-400/10 hover:text-cliff-300"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear all data
          </Button>
        </Row>
      </Section>

      {/* ---------------- About ---------------- */}
      <Section label="About">
        <Row
          title="Version"
          support={bridgeVersion ? `Android shell reports ${bridgeVersion}` : 'Local-first · MIT licensed · open source'}
        >
          <span className="pv-num text-sm font-semibold text-mist-200">
            v{bridgeVersion ?? APP_VERSION}
          </span>
        </Row>
        <div className="px-5 py-4 sm:px-6">
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mist-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-400" strokeWidth={1.75} aria-hidden />
            No account, no bank link, no server — an organizational tool, not financial
            advice. Money data lives on this device alone.
          </p>
          <div className="mt-3 flex gap-4 text-xs">
            <a
              href="https://github.com/srivtx/pocketveto"
              target="_blank"
              rel="noreferrer"
              className="text-mist-400 underline-offset-4 transition-colors hover:text-mist-200 hover:underline"
            >
              Source on GitHub
            </a>
            <a
              href="https://github.com/srivtx/pocketveto/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noreferrer"
              className="text-mist-400 underline-offset-4 transition-colors hover:text-mist-200 hover:underline"
            >
              Changelog
            </a>
          </div>
        </div>
      </Section>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="border-ink-800 bg-ink-925 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight text-mist-100">
              Delete all PocketVeto data on this device?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-mist-400">
              Every item, every saved entry. This cannot be undone — there is no cloud copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ink-800 bg-transparent text-mist-300 hover:bg-ink-900 hover:text-mist-100">
              Keep my data
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cliff-400 font-semibold text-ink-950 hover:bg-cliff-300"
              onClick={() => {
                onClearAll();
                toast({ title: 'Cleared', description: 'All items removed from this device.' });
              }}
            >
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSample} onOpenChange={setConfirmSample}>
        <AlertDialogContent className="border-ink-800 bg-ink-925 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight text-mist-100">
              Replace your {items.length} item{items.length === 1 ? '' : 's'} with the sample set?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-mist-400">
              The demo replaces everything on this device. Export first if you want to keep
              your current money dates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ink-800 bg-transparent text-mist-300 hover:bg-ink-900 hover:text-mist-100">
              Keep mine
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
              onClick={() => {
                onLoadSample();
                toast({ title: 'Sample loaded', description: 'Eight demo money dates across every kind.' });
              }}
            >
              Load sample
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
