export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
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
  createdAt: string;
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
