"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TranscriptView } from "@/components/transcript-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  apiFetch,
  formatDateTime,
  type Booking,
  type BookingStatus,
  type Conversation,
  type Provider,
} from "@/lib/api";

const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<Booking>(`/bookings/${id}`)
      .then((b) => {
        setBooking(b);
        if (b.providerId) {
          apiFetch<Provider>(`/providers/${b.providerId}`)
            .then(setProvider)
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message));

    apiFetch<Conversation[]>("/conversations")
      .then((all) => setConversation(all.find((c) => c.bookingId === id) ?? null))
      .catch(() => {});
  }

  useEffect(load, [id]);

  async function changeStatus(status: BookingStatus) {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<Booking>(`/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBooking(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    setBusy(true);
    try {
      await apiFetch(`/bookings/${id}`, { method: "DELETE" });
      router.push("/bookings");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (error && !booking) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <PageHeader
          title={booking.name}
          subtitle={`Booking #${booking.id.slice(0, 8)}`}
          backHref="/bookings"
          actions={<StatusBadge status={booking.status} />}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Field label="Name" value={booking.name} />
            <Field label="Phone" value={booking.phone} />
            <Field label="Email" value={booking.email} />
            {booking.company && <Field label="Company" value={booking.company} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Field label="Service" value={booking.service} />
            {booking.budget && <Field label="Budget" value={booking.budget} />}
            <Field
              label="Provider"
              value={provider ? `${provider.name} (${provider.service})` : "Not assigned"}
            />
            <Field
              label="Scheduled"
              value={
                booking.startsAt
                  ? `${formatDateTime(booking.startsAt)} – ${formatDateTime(booking.endsAt)}`
                  : `${booking.preferredDate} ${booking.preferredTime}`
              }
            />
            <Field
              label="Google Calendar"
              value={booking.googleEventId ? "Synced ✓" : "Not synced"}
            />
            {booking.notes && <Field label="Notes" value={booking.notes} />}
            <Field label="Created" value={formatDateTime(booking.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {NEXT_STATUSES[booking.status].map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  disabled={busy}
                  onClick={() => changeStatus(s)}
                  className="capitalize"
                >
                  Mark as {s}
                </Button>
              ))}
              <Button variant="destructive" disabled={busy} onClick={handleDelete}>
                Delete booking
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation transcript</CardTitle>
          </CardHeader>
          <CardContent>
            {conversation ? (
              <TranscriptView transcript={conversation.transcript} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No linked conversation found (this booking may have been created
                directly via the API rather than through chat).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
