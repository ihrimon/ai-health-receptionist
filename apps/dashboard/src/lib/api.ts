export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * The real admin_session cookie belongs to the API's own domain (set by
 * its Set-Cookie response) — the browser only ever attaches it to
 * requests TO the API, never to requests to the dashboard's own domain.
 * That's invisible locally (dashboard and API are both "localhost", just
 * different ports, so the host-only cookie reaches both), but once
 * deployed to separate domains (e.g. a vercel.app dashboard + an
 * onrender.com API) the dashboard's own server-side middleware
 * (src/proxy.ts) can never see it to gate /admin/* routes.
 *
 * This is a same-domain, non-httpOnly marker cookie the dashboard sets on
 * itself right after a successful login, purely so that middleware has
 * something local to check for the redirect-to-login UX. It carries no
 * session data — proxy.ts's own comment already documents that the real
 * security boundary is AdminAuthGuard on the API, not this cookie.
 */
const DASH_SESSION_COOKIE = "dash_session";
const DASH_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // matches AuthService.SESSION_TTL_MS

export function markDashboardSession() {
  document.cookie = `${DASH_SESSION_COOKIE}=1; path=/; max-age=${DASH_SESSION_MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearDashboardSession() {
  document.cookie = `${DASH_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Thin JSON fetch wrapper — throws with the API's own message when present. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (Array.isArray(body?.message) ? body.message.join(", ") : body?.message) ??
      `API returned ${res.status}`;
    throw new Error(message);
  }

  // Some endpoints (e.g. DELETE) send a 200 with an empty body rather than
  // a 204 — parse defensively on the body's actual content, not the status
  // code, so those don't throw "Unexpected end of JSON input".
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type CallStatus = "ringing" | "in-progress" | "completed" | "failed";

export interface Provider {
  id: string;
  name: string;
  email: string;
  phone?: string;
  service: string;
  slotDurationMinutes: number;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAvailability {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  service: string;
  budget?: string;
  preferredDate: string;
  preferredTime: string;
  providerId?: string;
  startsAt?: string;
  endsAt?: string;
  googleEventId?: string;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CallSession {
  id: string;
  callSid: string;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface Conversation {
  id: string;
  bookingId?: string;
  booking?: Booking;
  callSid: string;
  transcript?: ChatTurn[];
  summary?: string;
  duration?: number;
  rating?: number;
  createdAt: string;
}

export interface LlmCredential {
  id: string;
  apiKey: string;
  model: string;
  sortOrder: number;
  isActive: boolean;
  lastUsedAt?: string;
  rlLimitRequests?: number;
  rlRemainingRequests?: number;
  rlResetRequests?: string;
  rlLimitTokens?: number;
  rlRemainingTokens?: number;
  rlResetTokens?: string;
  createdAt: string;
  updatedAt: string;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

/** Formats a "HH:mm" or "HH:mm:ss" time-of-day string as e.g. "9:00 AM". */
export function formatTime(time: string): string {
  const [hours = "0", minutes = "0"] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
