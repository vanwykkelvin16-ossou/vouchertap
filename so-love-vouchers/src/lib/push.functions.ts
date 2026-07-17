import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import webpush from "web-push";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizeVapidSubject(raw: string | undefined): string {
  const fallback = "mailto:admin@solovekrugersdorp.com";
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) return value;
  if (/^https:\/\/[^\s]+$/i.test(value)) {
    try {
      new URL(value);
      return value;
    } catch {
      return fallback;
    }
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return fallback;
}

function normalizeVapidKey(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  // Convert standard Base64 -> URL-safe Base64 and strip "=" padding
  return raw.trim().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function configureVapid() {
  const publicKey =
    normalizeVapidKey(process.env.VAPID_PUBLIC_KEY) ||
    "BIkXIoUaoj8o9TAUbZ6qKQbY8Z6MyZAGN7Od-BBFAftggCxEnUnBXfhSKJTuq4J65v6dTAnHC494G7vTVWMlbqo";
  const privateKey = normalizeVapidKey(process.env.VAPID_PRIVATE_KEY);
  const subject = normalizeVapidSubject(process.env.VAPID_SUBJECT);
  if (!privateKey)
    throw new Error(
      "Push notifications are not configured (missing VAPID private key). Please contact support.",
    );
  if (privateKey.length !== 43) {
    throw new Error(
      `Invalid VAPID private key length (${privateKey.length}). Expected 43 URL-safe Base64 chars (32 bytes, no "=" padding).`,
    );
  }
  if (publicKey.length !== 87) {
    throw new Error(
      `Invalid VAPID public key length (${publicKey.length}). Expected 87 URL-safe Base64 chars (65 bytes, no "=" padding).`,
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
  user_agent: z.string().max(512).optional(),
  notify_vouchers: z.boolean().optional(),
  notify_events: z.boolean().optional(),
});

export const saveSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => subscribeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent ?? null,
        notify_vouchers: data.notify_vouchers ?? true,
        notify_events: data.notify_events ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        notify_vouchers: z.boolean().optional(),
        notify_events: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: {
      updated_at: string;
      notify_vouchers?: boolean;
      notify_events?: boolean;
    } = { updated_at: new Date().toISOString() };
    if (typeof data.notify_vouchers === "boolean") patch.notify_vouchers = data.notify_vouchers;
    if (typeof data.notify_events === "boolean") patch.notify_events = data.notify_events;
    const { error } = await supabase.from("push_subscriptions").update(patch).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url().max(2048) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyPushPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, notify_vouchers, notify_events")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { subscriptions: data ?? [] };
  });

const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  category: z.enum(["vouchers", "events"]),
  url: z.string().min(1).max(500).optional(),
  image: z.string().url().max(1000).optional(),
});

export const broadcastPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => broadcastSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    configureVapid();

    // Admin gate + subscription list live in a SECURITY DEFINER RPC, so this
    // runs under the caller's own session (no service-role key needed).
    const { data: subs, error } = await supabase.rpc("get_broadcast_subscriptions", {
      _category: data.category,
    });
    if (error) {
      throw new Error(error.message === "not_authorized" ? "Forbidden" : error.message);
    }

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url ?? (data.category === "vouchers" ? "/app/vouchers" : "/app/events"),
      image: data.image,
      tag: `${data.category}-${Date.now()}`,
    });

    const stale: string[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload,
            {
              TTL: 60 * 60 * 24,
              urgency: "high",
              topic: data.category.slice(0, 32),
            },
          );
          sent += 1;
        } catch (err: unknown) {
          const code = (err as { statusCode?: number })?.statusCode;
          const body = (err as { body?: string })?.body;
          if (code === 404 || code === 410) {
            stale.push(s.endpoint);
          } else {
            failed += 1;
            console.error("push error", code, (err as Error)?.message, body);
          }
        }
      }),
    );

    if (stale.length > 0) {
      await supabase.rpc("remove_push_endpoints", { _endpoints: stale });
    }

    console.log(
      `[broadcastPush] category=${data.category} total=${subs?.length ?? 0} sent=${sent} failed=${failed} removed=${stale.length}`,
    );

    return { sent, failed, removed: stale.length, total: subs?.length ?? 0 };
  });

const testPushSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().max(400).optional(),
});

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => testPushSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    configureVapid();

    // RLS limits this to the caller's own subscriptions.
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      throw new Error("No push subscription found for your account on this device.");
    }

    const payload = JSON.stringify({
      title: data.title ?? "Test notification",
      body: data.body ?? "If you see this on your lock screen, push is working.",
      url: "/app",
      tag: `test-${Date.now()}`,
    });

    const stale: string[] = [];
    const errors: string[] = [];
    let sent = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60, urgency: "high", topic: "test" },
          );
          sent += 1;
        } catch (err: unknown) {
          const code = (err as { statusCode?: number })?.statusCode;
          const msg = (err as Error)?.message ?? "unknown";
          const body = (err as { body?: string })?.body ?? "";
          console.error("[sendTestPush] error", code, msg, body);
          if (code === 404 || code === 410) {
            stale.push(s.endpoint);
          } else {
            errors.push(`${code ?? "?"}: ${msg}${body ? ` (${body})` : ""}`);
          }
        }
      }),
    );

    if (stale.length > 0) {
      await supabase.rpc("remove_push_endpoints", { _endpoints: stale });
    }

    return { sent, total: subs.length, removed: stale.length, errors };
  });
