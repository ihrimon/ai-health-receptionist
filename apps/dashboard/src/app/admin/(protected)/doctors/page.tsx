"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardAction,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, formatDateTime, type Provider } from "@/lib/api";
import { SERVICE_OPTIONS, CUSTOM_SERVICE } from "@/lib/specialties";
import { toastError, toastSuccess } from "@/lib/toast";

const SLOT_DURATIONS = ["10", "20", "30", "40", "50", "60"];

const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

function getTimezoneOptions(): string[] {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {
    // fall through to the fallback list below
  }
  return FALLBACK_TIMEZONES;
}

// Computed once — the full IANA tz database via the runtime's own ICU
// data, not hand-maintained, so it's never stale. Falls back to a short
// hand-picked list only on a runtime old enough to lack
// Intl.supportedValuesOf.
const TIMEZONES = getTimezoneOptions();

interface FormState {
  name: string;
  email: string;
  phone: string;
  service: string;
  slotDurationMinutes: string;
  timezone: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  service: "",
  slotDurationMinutes: "30",
  timezone: "Asia/Dhaka",
};

function toFormState(p: Provider): FormState {
  return {
    name: p.name,
    email: p.email,
    phone: p.phone ?? "",
    service: p.service,
    slotDurationMinutes: String(p.slotDurationMinutes),
    timezone: p.timezone,
  };
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Provider | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiFetch<Provider[]>("/providers")
      .then(setProviders)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function toDto(f: FormState) {
    return {
      name: f.name,
      email: f.email,
      phone: f.phone || undefined,
      service: f.service,
      slotDurationMinutes: Number(f.slotDurationMinutes) || 30,
      timezone: f.timezone || "Asia/Dhaka",
    };
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch<Provider>("/providers", {
        method: "POST",
        body: JSON.stringify(toDto(createForm)),
      });
      toastSuccess(`${createForm.name} was added.`);
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      load();
    } catch (err) {
      toastError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: Provider) {
    setEditing(p);
    setEditForm(toFormState(p));
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editForm) return;
    setSaving(true);
    try {
      await apiFetch<Provider>(`/providers/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(toDto(editForm)),
      });
      toastSuccess(`${editForm.name} was updated.`);
      setEditing(null);
      setEditForm(null);
      load();
    } catch (err) {
      toastError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Provider) {
    try {
      await apiFetch<Provider>(`/providers/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      toastSuccess(`${p.name} is now ${p.isActive ? "inactive" : "active"}.`);
      load();
    } catch (err) {
      toastError((err as Error).message);
    }
  }

  async function handleDelete(p: Provider) {
    if (
      !confirm(
        `Delete doctor "${p.name}"? Their bookings will be unassigned, not deleted.`,
      )
    )
      return;
    setBusyId(p.id);
    try {
      await apiFetch(`/providers/${p.id}`, { method: "DELETE" });
      toastSuccess(`${p.name} was deleted.`);
      load();
    } catch (err) {
      toastError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Doctors</CardTitle>
          <CardDescription>
            {providers ? `${providers.length} total` : "Loading…"}
          </CardDescription>
          <CardAction>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={
                  <Button>
                    <Plus /> New doctor
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New doctor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="grid gap-3">
                  <ProviderFormFields form={createForm} setForm={setCreateForm} />
                  <DialogFooter>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Create doctor"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

          {!error && !providers && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {providers && providers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No doctors yet — add one to start scheduling.
            </p>
          )}

          {providers && providers.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/admin/doctors/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {p.email}
                        </div>
                      </TableCell>
                      <TableCell>{p.service}</TableCell>
                      <TableCell>{p.slotDurationMinutes} min</TableCell>
                      <TableCell>{p.timezone}</TableCell>
                      <TableCell>
                        <button type="button" onClick={() => toggleActive(p)}>
                          <Badge
                            variant="outline"
                            className={
                              p.isActive
                                ? "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : ""
                            }
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(p.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit doctor"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete doctor"
                            disabled={busyId === p.id}
                            onClick={() => handleDelete(p)}
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
            <DialogTitle>Edit doctor</DialogTitle>
          </DialogHeader>
          {editForm && (
            <form onSubmit={handleSaveEdit} className="grid gap-3">
              <ProviderFormFields
                form={editForm}
                setForm={(update) =>
                  setEditForm((f) => (f ? update(f) : f))
                }
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
    </div>
  );
}

function ProviderFormFields({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (update: (f: FormState) => FormState) => void;
}) {
  const isCustomService = form.service !== "" && !SERVICE_OPTIONS.includes(form.service);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Name</Label>
        <Input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Email</Label>
        <Input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>

      <LabeledInput
        label="Phone (optional)"
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
      />

      <div className="grid gap-1.5">
        <Label>Service</Label>
        <Select
          value={isCustomService ? CUSTOM_SERVICE : form.service}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              service: v === CUSTOM_SERVICE ? "" : (v ?? ""),
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a specialty" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_SERVICE}>Custom…</SelectItem>
          </SelectContent>
        </Select>
        {isCustomService && (
          <Input
            required
            autoFocus
            value={form.service}
            onChange={(e) =>
              setForm((f) => ({ ...f, service: e.target.value }))
            }
            placeholder="Exact specialty name"
            className="mt-1.5"
          />
        )}
      </div>

      <div className="grid gap-1.5">
        <Label>Slot duration</Label>
        <Select
          value={form.slotDurationMinutes}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, slotDurationMinutes: v ?? "30" }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLOT_DURATIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {d} minutes
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Timezone</Label>
        <Select
          value={form.timezone}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, timezone: v ?? "Asia/Dhaka" }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72" alignItemWithTrigger={false}>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
