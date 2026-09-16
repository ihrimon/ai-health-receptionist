"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  apiFetch,
  formatDateTime,
  type LlmCredential,
  type LlmProvider,
} from "@/lib/api";

const PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "gemini", label: "Google (Gemini)" },
];

// A starting point, not an exhaustive/live list — providers ship new
// models faster than this can be kept in sync. "Custom…" always escapes
// to a free-text field for anything not listed here.
const MODELS_BY_PROVIDER: Record<LlmProvider, string[]> = {
  groq: [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  anthropic: [
    "claude-sonnet-5",
    "claude-opus-5",
    "claude-haiku-4-5-20251001",
    "claude-fable-5-1",
  ],
  gemini: ["gemini-3.6-flash", "gemini-3.6-pro", "gemini-flash-latest"],
};
const CUSTOM_MODEL = "__custom__";

export default function SettingsPage() {
  return <LlmCredentialsSettings />;
}

function maskKey(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return `${"•".repeat(Math.max(apiKey.length - 4, 8))}${tail}`;
}

/**
 * A snapshot of the provider's own rate-limit headers from the last time
 * this credential was actually used to answer a chat — not a live/polled
 * value (that would burn quota just to check). Shown so an admin can tell
 * how close a key is to its limit without leaving the dashboard.
 */
const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** "1m26.442s" / "19.717s" -> "1m26s" / "20s" — drop sub-second precision, nobody needs it. */
function roundDuration(duration: string): string {
  return duration.replace(/\d+\.\d+/g, (n) => String(Math.round(Number(n))));
}

function UsageStat({
  remaining,
  limit,
  reset,
  unit,
  low,
}: {
  remaining: number;
  limit: number;
  reset?: string;
  unit: string;
  low: boolean;
}) {
  return (
    <span className={low ? "text-amber-600 dark:text-amber-400" : undefined}>
      {compactNumber.format(remaining)}/{compactNumber.format(limit)} {unit}
      {reset && (
        <span className="text-muted-foreground/70">
          {" "}
          — resets in {roundDuration(reset)}
        </span>
      )}
    </span>
  );
}

function UsageLine({ credential: c }: { credential: LlmCredential }) {
  if (!c.lastUsedAt) {
    return (
      <p className="mt-1 text-xs text-muted-foreground/70">Not used yet</p>
    );
  }

  const hasRequests =
    c.rlRemainingRequests !== undefined && c.rlLimitRequests !== undefined;
  const hasTokens =
    c.rlRemainingTokens !== undefined && c.rlLimitTokens !== undefined;

  if (!hasRequests && !hasTokens) {
    return (
      <p className="mt-1 text-xs text-muted-foreground/70">
        Last used {formatDateTime(c.lastUsedAt)}
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-col text-xs">
      {hasRequests && (
        <UsageStat
          remaining={c.rlRemainingRequests!}
          limit={c.rlLimitRequests!}
          reset={c.rlResetRequests}
          unit="requests"
          low={c.rlRemainingRequests! / c.rlLimitRequests! < 0.1}
        />
      )}
      {hasTokens && (
        <UsageStat
          remaining={c.rlRemainingTokens!}
          limit={c.rlLimitTokens!}
          reset={c.rlResetTokens}
          unit="token"
          low={c.rlRemainingTokens! / c.rlLimitTokens! < 0.1}
        />
      )}
    </div>
  );
}

function LlmCredentialsSettings() {
  const [credentials, setCredentials] = useState<LlmCredential[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LlmCredential | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [provider, setProvider] = useState<LlmProvider>("groq");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(MODELS_BY_PROVIDER.groq[0]);
  const [customModel, setCustomModel] = useState("");
  const [saving, setSaving] = useState(false);

  function selectProvider(next: LlmProvider) {
    setProvider(next);
    setModel(MODELS_BY_PROVIDER[next][0]);
    setCustomModel("");
  }

  function load() {
    apiFetch<LlmCredential[]>("/llm-credentials")
      .then(setCredentials)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  // Usage numbers (remaining requests/tokens) change the moment the chat
  // assistant actually uses a key, not on any schedule of ours — poll
  // periodically so an admin watching this page sees it move without
  // having to manually reload.
  useEffect(() => {
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  function toggleRevealed(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const resolvedModel = model === CUSTOM_MODEL ? customModel.trim() : model;
    if (!resolvedModel) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/llm-credentials", {
        method: "POST",
        body: JSON.stringify({ provider, apiKey, model: resolvedModel }),
      });
      setApiKey("");
      selectProvider("groq");
      setCreateOpen(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: LlmCredential) {
    setBusyId(c.id);
    try {
      await apiFetch(`/llm-credentials/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!credentials) return;
    const target = index + direction;
    if (target < 0 || target >= credentials.length) return;
    const orderedIds = credentials.map((c) => c.id);
    [orderedIds[index], orderedIds[target]] = [
      orderedIds[target],
      orderedIds[index],
    ];
    setBusyId(credentials[index].id);
    try {
      await apiFetch("/llm-credentials/reorder", {
        method: "PATCH",
        body: JSON.stringify({ orderedIds }),
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await apiFetch(`/llm-credentials/${deleteTarget.id}`, {
        method: "DELETE",
      });
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
      <div className="mx-auto grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>LLM API keys</CardTitle>
            <CardDescription>
              The chat assistant uses the first key below to answer.
              If it hits its provider&apos;s rate limit, it automatically
              falls back to the next one — no code or redeploy needed to
              add, remove, or reorder keys, and you&apos;re not tied to any
              one provider.
            </CardDescription>
            <CardAction className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh usage"
                onClick={load}
              >
                <RefreshCw />
              </Button>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger
                  render={
                    <Button>
                      <Plus /> Add key
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add API key</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label>Provider</Label>
                      <Select
                        value={provider}
                        onValueChange={(v) => selectProvider(v as LlmProvider)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>API key</Label>
                      <Input
                        type="password"
                        required
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="gsk_… / sk_… / etc."
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Model</Label>
                      <Select
                        value={model}
                        onValueChange={(v) => setModel(v ?? CUSTOM_MODEL)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS_BY_PROVIDER[provider].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                          <SelectItem value={CUSTOM_MODEL}>Custom…</SelectItem>
                        </SelectContent>
                      </Select>
                      {model === CUSTOM_MODEL && (
                        <Input
                          required
                          autoFocus
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="Exact model id"
                          className="mt-1.5"
                        />
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving…" : "Add key"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            {!error && !credentials && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {credentials && credentials.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No API keys yet — add one so the chat assistant can answer.
              </p>
            )}

            <div className="grid gap-2">
              {credentials?.map((c, index) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
                >
                  <div className="flex shrink-0 flex-col">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move up"
                      disabled={index === 0 || busyId === c.id}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move down"
                      disabled={index === credentials.length - 1 || busyId === c.id}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Badge>Default</Badge>}
                      <span className="text-sm font-medium">{c.model}</span>
                      <span className="text-xs text-muted-foreground">
                        {PROVIDERS.find((p) => p.value === c.provider)
                          ?.label ?? c.provider}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <span>
                        {revealed.has(c.id) ? c.apiKey : maskKey(c.apiKey)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRevealed(c.id)}
                        aria-label={revealed.has(c.id) ? "Hide key" : "Show key"}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {revealed.has(c.id) ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                    <UsageLine credential={c} />
                  </div>

                  <button type="button" onClick={() => toggleActive(c)}>
                    <Badge
                      variant="outline"
                      className={
                        c.isActive
                          ? "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : ""
                      }
                    >
                      {c.isActive ? "Active" : "Paused"}
                    </Badge>
                  </button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete key"
                    disabled={busyId === c.id}
                    onClick={() => setDeleteTarget(c)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete the key for{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.model}
            </span>
            ? The chat assistant will stop using it immediately.
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
