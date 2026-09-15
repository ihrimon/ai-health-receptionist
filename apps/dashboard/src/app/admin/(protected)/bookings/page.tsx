"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch, formatDateTime, type Booking, type Provider } from "@/lib/api";

const STATUS_FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"] as const;

interface EditForm {
  name: string;
  phone: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
}

function toEditForm(b: Booking): EditForm {
  return {
    name: b.name,
    phone: b.phone,
    email: b.email,
    company: b.company ?? "",
    service: b.service,
    budget: b.budget ?? "",
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    notes: b.notes ?? "",
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("all");

  const [editing, setEditing] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  function load() {
    Promise.all([
      apiFetch<Booking[]>("/bookings"),
      apiFetch<Provider[]>("/providers"),
    ])
      .then(([b, p]) => {
        setBookings(b);
        setProviders(p);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  const providerName = useMemo(() => {
    const map = new Map(providers.map((p) => [p.id, p.name]));
    return (id?: string) => (id ? (map.get(id) ?? "Unknown doctor") : "—");
  }, [providers]);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, statusFilter]);

  function openEdit(b: Booking) {
    setEditing(b);
    setEditForm(toEditForm(b));
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editForm) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<Booking>(`/bookings/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...editForm,
          company: editForm.company || undefined,
          budget: editForm.budget || undefined,
          notes: editForm.notes || undefined,
        }),
      });
      setEditing(null);
      setEditForm(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await apiFetch(`/bookings/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>
            {bookings ? `${bookings.length} total` : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, service…"
              className="max-w-sm"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as (typeof STATUS_FILTERS)[number])
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          {!error && !bookings && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {bookings && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No bookings match your filters.
            </p>
          )}

          {filtered.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="font-medium hover:underline"
                        >
                          {b.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.phone}
                      </TableCell>
                      <TableCell>{b.service}</TableCell>
                      <TableCell>{providerName(b.providerId)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {b.startsAt
                          ? formatDateTime(b.startsAt)
                          : `${b.preferredDate} ${b.preferredTime}`}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={b.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(b.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit booking"
                            onClick={() => openEdit(b)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete booking"
                            disabled={busyId === b.id}
                            onClick={() => setDeleteTarget(b)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setEditForm(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
          </DialogHeader>
          {editForm && (
            <form onSubmit={handleSaveEdit} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledInput
                  label="Name"
                  required
                  value={editForm.name}
                  onChange={(v) => setEditForm((f) => f && { ...f, name: v })}
                />
                <LabeledInput
                  label="Phone"
                  required
                  value={editForm.phone}
                  onChange={(v) => setEditForm((f) => f && { ...f, phone: v })}
                />
                <LabeledInput
                  label="Email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(v) => setEditForm((f) => f && { ...f, email: v })}
                />
                <LabeledInput
                  label="Company"
                  value={editForm.company}
                  onChange={(v) => setEditForm((f) => f && { ...f, company: v })}
                />
                <LabeledInput
                  label="Service"
                  required
                  value={editForm.service}
                  onChange={(v) => setEditForm((f) => f && { ...f, service: v })}
                />
                <LabeledInput
                  label="Budget"
                  value={editForm.budget}
                  onChange={(v) => setEditForm((f) => f && { ...f, budget: v })}
                />
                <LabeledInput
                  label="Preferred date"
                  type="date"
                  required
                  value={editForm.preferredDate}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, preferredDate: v })
                  }
                />
                <LabeledInput
                  label="Preferred time"
                  type="time"
                  required
                  value={editForm.preferredTime}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, preferredTime: v })
                  }
                />
              </div>
              <LabeledInput
                label="Notes"
                value={editForm.notes}
                onChange={(v) => setEditForm((f) => f && { ...f, notes: v })}
              />
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete the booking for{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            ? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === deleteTarget?.id}
              onClick={confirmDelete}
            >
              {busyId === deleteTarget?.id ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
