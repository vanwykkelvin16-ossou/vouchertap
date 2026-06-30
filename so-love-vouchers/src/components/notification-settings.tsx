import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  pushSupported,
  pushPreviewBlocked,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  isIOSDevice,
  isStandalone,
} from "@/lib/push";
import {
  saveSubscription,
  removeSubscription,
  updatePreferences,
  getMyPushPrefs,
  sendTestPush,
} from "@/lib/push.functions";

export function NotificationSettings() {
  const save = useServerFn(saveSubscription);
  const remove = useServerFn(removeSubscription);
  const updatePrefs = useServerFn(updatePreferences);
  const fetchPrefs = useServerFn(getMyPushPrefs);
  const testPush = useServerFn(sendTestPush);

  const [enabled, setEnabled] = useState(false);
  const [notifyVouchers, setNotifyVouchers] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const supported = pushSupported();
  const previewBlocked = pushPreviewBlocked();
  const iosNeedsInstall = isIOSDevice() && !isStandalone();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported) {
        setLoaded(true);
        return;
      }
      try {
        const sub = await getPushSubscription();
        if (cancelled) return;
        setEnabled(!!sub);
        if (sub) {
          const { subscriptions } = await fetchPrefs();
          const me = subscriptions.find((s) => s.endpoint === sub.endpoint);
          if (me) {
            setNotifyVouchers(me.notify_vouchers);
            setNotifyEvents(me.notify_events);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  async function handleEnable() {
    setBusy(true);
    try {
      const sub = await subscribeToPush();
      if (!sub) throw new Error("Failed to subscribe");
      await save({
        data: {
          ...sub,
          user_agent: navigator.userAgent,
          notify_vouchers: notifyVouchers,
          notify_events: notifyEvents,
        },
      });
      setEnabled(true);
      toast.success("Notifications enabled");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not enable notifications";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await remove({ data: { endpoint } });
      setEnabled(false);
      toast.success("Notifications turned off");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not disable notifications";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handlePrefChange(key: "vouchers" | "events", value: boolean) {
    if (key === "vouchers") setNotifyVouchers(value);
    else setNotifyEvents(value);
    if (!enabled) return;
    try {
      await updatePrefs({
        data:
          key === "vouchers"
            ? { notify_vouchers: value }
            : { notify_events: value },
      });
    } catch (e) {
      console.error(e);
      toast.error("Could not save preference");
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Bell className="size-4" />
          </div>
          <div>
            <h2 className="font-bold leading-tight">Push notifications</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get notified when new vouchers or events go live.
            </p>
          </div>
        </div>
      </div>

      {previewBlocked ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-dashed p-3 text-xs text-muted-foreground">
          <Info className="size-4 mt-0.5 flex-shrink-0" />
          <span>
            Notifications are disabled in this in-app preview. Open the published site or install the app to enable them.
          </span>
        </div>
      ) : !supported ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-dashed p-3 text-xs text-muted-foreground">
          <Info className="size-4 mt-0.5 flex-shrink-0" />
          <span>This browser doesn't support push notifications.</span>
        </div>
      ) : (
        <>
          {iosNeedsInstall && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
              <Smartphone className="size-4 mt-0.5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">iPhone tip</p>
                <p className="text-muted-foreground mt-0.5">
                  To receive notifications on iOS, tap the share icon in Safari and choose "Add to Home Screen", then open the app from your home screen.
                </p>
              </div>
            </div>
          )}

          {!loaded ? (
            <div className="grid place-items-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !enabled ? (
            <Button onClick={handleEnable} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Bell className="size-4 mr-2" />}
              Enable notifications
            </Button>
          ) : (
            <>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm">New vouchers</span>
                  <Switch
                    checked={notifyVouchers}
                    onCheckedChange={(v) => handlePrefChange("vouchers", v)}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm">New events</span>
                  <Switch
                    checked={notifyEvents}
                    onCheckedChange={(v) => handlePrefChange("events", v)}
                  />
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await testPush({ data: {} });
                    if (res.sent > 0) {
                      toast.success("Test push sent - check your lock screen in a few seconds.");
                    } else if (res.errors.length > 0) {
                      toast.error(`Push failed: ${res.errors[0]}`);
                    } else {
                      toast.error("No active subscription found.");
                    }
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Test failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="w-full"
              >
                {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Bell className="size-4 mr-2" />}
                Send test notification
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisable}
                disabled={busy}
                className="w-full text-muted-foreground"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <BellOff className="size-4 mr-2" />
                )}
                Turn off on this device
              </Button>
            </>
          )}
        </>
      )}
    </Card>
  );
}
