"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  API_URL,
  apiFetch,
  DAY_NAMES,
  type Provider,
  type ProviderAvailability,
} from "@/lib/api";

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [blocks, setBlocks] = useState<ProviderAvailability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  function load() {
    apiFetch<Provider>(`/providers/${id}`)
      .then(setProvider)
      .catch((err) => setError(err.message));
    apiFetch<ProviderAvailability[]>(`/providers/${id}/availability`)
      .then(setBlocks)
      .catch(() => {});
  }

  useEffect(load, [id]);

  async function addBlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/providers/${id}/availability`, {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: Number(dayOfWeek),
          startTime,
          endTime,
        }),
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(blockId: string) {
    setBusy(true);
    try {
      await apiFetch(`/providers/${id}/availability/${blockId}`, {
        method: "DELETE",
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnectGoogle() {
    if (!confirm("Disconnect this provider's Google Calendar?")) return;
    setBusy(true);
    try {
      await apiFetch(`/providers/${id}/google`, { method: "DELETE" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this provider? Existing bookings will be unassigned."))
      return;
    setBusy(true);
    try {
      await apiFetch(`/providers/${id}`, { method: "DELETE" });
      router.push("/admin/providers");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!provider) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">{error ?? "Loading…"}</p>
      </div>
    );
  }

  const blocksByDay = DAY_NAMES.map((name, day) => ({
    name,
    day,
    blocks: blocks
      .filter((b) => b.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <PageHeader
          title={provider.name}
          subtitle={`${provider.service} · ${provider.slotDurationMinutes} min slots · ${provider.timezone}`}
          backHref="/admin/providers"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Weekly availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {blocksByDay.map(({ name, day, blocks: dayBlocks }) => (
                <div key={day} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">
                    {name}
                  </span>
                  {dayBlocks.length === 0 ? (
                    <span className="text-muted-foreground/60">—</span>
                  ) : (
                    dayBlocks.map((b) => (
                      <Badge key={b.id} variant="secondary" className="gap-1">
                        {b.startTime}–{b.endTime}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeBlock(b.id)}
                          aria-label="Remove block"
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={addBlock}
              className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4"
            >
              <div className="grid gap-1.5">
                <Label>Day</Label>
                <Select
                  value={dayOfWeek}
                  onValueChange={(v) => setDayOfWeek(v ?? "1")}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((name, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Start</Label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>End</Label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                />
              </div>
              <Button type="submit" disabled={busy}>
                Add block
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Calendar sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect this provider&apos;s Google Calendar to read busy time
              and write confirmed-booking events automatically. Connecting
              again re-links the account; disconnecting is safe even if
              nothing is currently connected.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                nativeButton={false}
                render={
                  <a href={`${API_URL}/providers/${id}/google/connect`}>
                    Connect Google Calendar
                  </a>
                }
              />
              <Button variant="outline" disabled={busy} onClick={disconnectGoogle}>
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled={busy} onClick={handleDelete}>
              Delete provider
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
