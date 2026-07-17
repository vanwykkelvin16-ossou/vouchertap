// Browser-side push notification helpers.
// Service worker is kept inert inside the Lovable preview iframe to avoid caching issues.

export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  "BIkXIoUaoj8o9TAUbZ6qKQbY8Z6MyZAGN7Od-BBFAftggCxEnUnBXfhSKJTuq4J65v6dTAnHC494G7vTVWMlbqo";

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return (
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.dev") ||
    host === "localhost"
  );
}

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isPreviewOrIframe()) return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushPreviewBlocked(): boolean {
  return typeof window !== "undefined" && isPreviewOrIframe();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<{
  endpoint: string;
  p256dh: string;
  auth: string;
} | null> {
  if (!pushSupported()) throw new Error("Push notifications are not supported on this device");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied");

  const reg = await registerServiceWorker();
  if (!reg) throw new Error("Could not register service worker");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth")),
  };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const sub = await getPushSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS-specific
    window.navigator.standalone === true
  );
}
