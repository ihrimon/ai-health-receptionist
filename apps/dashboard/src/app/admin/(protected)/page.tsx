"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Headset,
  MessagesSquare,
  // PhoneCall, // Call History temporarily disabled
  Stethoscope,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  apiFetch,
  formatDateTime,
  type Booking,
  // type CallSession, // Call History temporarily disabled
  type Conversation,
  type Provider,
} from "@/lib/api";

export default function AdminOverviewPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  // const [calls, setCalls] = useState<CallSession[] | null>(null); // Call History temporarily disabled
  const [conversations, setConversations] = useState<Conversation[] | null>(
    null,
  );

  useEffect(() => {
    apiFetch<Booking[]>("/bookings").then(setBookings).catch(() => setBookings([]));
    apiFetch<Provider[]>("/providers").then(setProviders).catch(() => setProviders([]));
    // apiFetch<CallSession[]>("/call-sessions").then(setCalls).catch(() => setCalls([])); // Call History temporarily disabled
    apiFetch<Conversation[]>("/conversations")
      .then(setConversations)
      .catch(() => setConversations([]));
  }, []);

  const pendingCount = useMemo(
    () => bookings?.filter((b) => b.status === "pending").length ?? 0,
    [bookings],
  );
  const activeProviders = useMemo(
    () => providers?.filter((p) => p.isActive).length ?? 0,
    [providers],
  );

  const stats = [
    {
      title: "Total Bookings",
      value: bookings?.length,
      description: `${pendingCount} pending`,
      icon: CalendarClock,
      href: "/admin/bookings",
    },
    {
      title: "Active Doctors",
      value: activeProviders,
      description: providers ? `${providers.length} total` : undefined,
      icon: Stethoscope,
      href: "/admin/doctors",
    },
    {
      title: "Conversations",
      value: conversations?.length,
      description: "chat & voice",
      icon: MessagesSquare,
      href: "/admin/conversations",
    },
    // Call History temporarily disabled — see calls/page.tsx.
    // {
    //   title: "Calls",
    //   value: calls?.length,
    //   description: "Twilio call sessions",
    //   icon: PhoneCall,
    //   href: "/admin/calls",
    // },
  ];

  const recentBookings = bookings?.slice(0, 5) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Headset className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">BrainStack AI Receptionist</h1>
          <p className="text-sm text-muted-foreground">
            AI voice &amp; chat receptionist — admin overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.title} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader>
                <CardDescription>{s.title}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {s.value ?? "—"}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="size-4.5" />
                  </div>
                </CardAction>
              </CardHeader>
              {s.description && (
                <CardFooter className="text-xs text-muted-foreground">
                  {s.description}
                </CardFooter>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>The latest booking requests</CardDescription>
          <CardAction>
            <Link
              href="/admin/bookings"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          {!bookings ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings yet — try the{" "}
              <Link href="/chat" className="underline">
                chat page
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-medium hover:underline"
                      >
                        {b.name}
                      </Link>
                    </TableCell>
                    <TableCell>{b.service}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {b.startsAt
                        ? formatDateTime(b.startsAt)
                        : `${b.preferredDate} ${b.preferredTime}`}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
