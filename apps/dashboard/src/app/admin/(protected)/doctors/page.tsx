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
import { apiFetch, formatDateTime, type Provider } from "@/lib/api";

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
    setError(null);
    try {
      await apiFetch<Provider>("/providers", {
        method: "POST",
        body: JSON.stringify(toDto(createForm)),
      });
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      load();
    } catch (err) {
      setError((err as Error).message);
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
    setError(null);
    try {
      await apiFetch<Provider>(`/providers/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(toDto(editForm)),
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

  async function toggleActive(p: Provider) {
    try {
      await apiFetch<Provider>(`/providers/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      load();
    } catch (err) {
      setError((err as Error).message);
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
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LabeledInput
        label="Name"
        required
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
      />
      <LabeledInput
        label="Email"
        type="email"
        required
        value={form.email}
        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
      />
      <LabeledInput
        label="Phone (optional)"
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
      />
      <LabeledInput
        label="Service"
        required
        value={form.service}
        onChange={(v) => setForm((f) => ({ ...f, service: v }))}
      />
      <LabeledInput
        label="Slot duration (minutes)"
        type="number"
        value={form.slotDurationMinutes}
        onChange={(v) => setForm((f) => ({ ...f, slotDurationMinutes: v }))}
      />
      <LabeledInput
        label="Timezone"
        value={form.timezone}
        onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
      />
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
