import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import app, { auth } from "@/lib/firebase";
import { API_BASE } from "@/config/api";

const PUSH_TOKEN_KEY = "musicinsta_push_token";
const PUSH_ENABLED_KEY = "musicinsta_push_enabled";

async function authenticatedFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in is required.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || `Request failed (${response.status}).`);
  }
  return response;
}

export async function getCallIceServers(): Promise<RTCIceServer[]> {
  const response = await authenticatedFetch("/calls/ice-servers");
  const payload = (await response.json()) as { iceServers?: RTCIceServer[] };
  if (!Array.isArray(payload.iceServers) || payload.iceServers.length === 0)
    throw new Error("No call relay servers were returned.");
  return payload.iceServers;
}

export async function notifyIncomingCall(callId: string) {
  await authenticatedFetch(`/calls/${encodeURIComponent(callId)}/notify`, {
    method: "POST",
  });
}

async function serviceWorkerRegistration() {
  if (!("serviceWorker" in navigator))
    throw new Error("This browser does not support background notifications.");
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing || navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function registerPushNotifications() {
  if (!(await isSupported()))
    throw new Error("Push notifications are not supported by this browser.");
  const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
  if (!vapidKey) throw new Error("Web Push is not configured.");

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const registration = await serviceWorkerRegistration();
  const messaging = getMessaging(app);
  const pushToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!pushToken) throw new Error("The browser did not return a push registration.");

  await authenticatedFetch("/calls/push/register", {
    method: "POST",
    body: JSON.stringify({
      token: pushToken,
      platform: "web",
      user_agent: navigator.userAgent,
    }),
  });
  localStorage.setItem(PUSH_TOKEN_KEY, pushToken);
  localStorage.setItem(PUSH_ENABLED_KEY, "true");
  return pushToken;
}

export async function unregisterPushNotifications() {
  const storedToken = localStorage.getItem(PUSH_TOKEN_KEY);
  if (storedToken && auth.currentUser) {
    await authenticatedFetch("/calls/push/unregister", {
      method: "POST",
      body: JSON.stringify({ token: storedToken }),
    }).catch(() => undefined);
  }
  if (await isSupported()) await deleteToken(getMessaging(app)).catch(() => false);
  localStorage.removeItem(PUSH_TOKEN_KEY);
  localStorage.setItem(PUSH_ENABLED_KEY, "false");
}

export function pushNotificationsEnabled() {
  const saved = localStorage.getItem(PUSH_ENABLED_KEY);
  if (saved !== null) return saved === "true";
  return "Notification" in window && Notification.permission === "granted";
}
