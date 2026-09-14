"use client";

import { useEffect, useState } from "react";
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
import { StatusBadge } from "@/components/status-badge";
import { apiFetch, formatDateTime, type CallSession } from "@/lib/api";

function durationLabel(session: CallSession): string {
  if (!session.startedAt || !session.endedAt) return "—";
  const seconds = Math.round(
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) /
      1000,
  );
  if (seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CallsPage() {
  const [sessions, setSessions] = useState<CallSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CallSession[]>("/call-sessions")
      .then(setSessions)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            {sessions ? `${sessions.length} total` : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && !sessions && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {sessions && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No calls yet — this fills in once Twilio voice calls start
              reaching <code>/voice/incoming</code>.
            </p>
          )}

          {sessions && sessions.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call SID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Ended</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        {s.callSid}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} kind="call" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(s.startedAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(s.endedAt)}
                      </TableCell>
                      <TableCell>{durationLabel(s)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
