"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, X } from "lucide-react";
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
  formatTime,
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
    if (!confirm("Disconnect this doctor's Google Calendar?")) return;
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
    if (!confirm("Delete this doctor? Existing bookings will be unassigned."))
      return;
    setBusy(true);
    try {
      await apiFetch(`/providers/${id}`, { method: "DELETE" });
      router.push("/admin/doctors");
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
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="relative flex flex-col items-center bg-linear-to-r from-primary to-[#22d3ee] px-6 pb-6 pt-14">
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              className="absolute left-3 top-3 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              render={
                <Link href="/admin/doctors" aria-label="Back to doctors">
                  <ArrowLeft />
                </Link>
              }
            />
            <div className="size-24 shrink-0 overflow-hidden rounded-full border-4 border-white/80 bg-muted shadow-sm sm:size-28">
              <Image
                src="/doctor.png"
                alt={provider.name}
                width={112}
                height={112}
                className="size-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col items-center px-6 pb-6 pt-3 text-center">
            <h1 className="text-xl font-semibold">{provider.name}</h1>
            <p className="text-sm text-muted-foreground">
              {provider.service} · {provider.slotDurationMinutes} min slots ·{" "}
              {provider.timezone}
            </p>
          </div>
        </div>

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
                        {formatTime(b.startTime)}–{formatTime(b.endTime)}
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
              Connect this doctor&apos;s Google Calendar to read busy time
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
              Delete doctor
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
