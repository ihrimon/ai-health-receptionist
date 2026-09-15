"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch, formatDateTime, type Conversation } from "@/lib/api";

function preview(conversation: Conversation): string {
  const turns = conversation.transcript ?? [];
  const firstUser = turns.find((t) => t.role === "user");
  return firstUser?.text ?? conversation.summary ?? "(no transcript)";
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Conversation[]>("/conversations")
      .then(setConversations)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            {conversations ? `${conversations.length} total` : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {conversations && conversations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No conversations yet — try the{" "}
              <Link href="/chat" className="underline">
                chat page
              </Link>
              .
            </p>
          )}

          <div className="grid gap-2">
            {conversations?.map((c) => (
              <Link
                key={c.id}
                href={`/admin/conversations/${c.id}`}
                className="rounded-lg border p-3 transition-colors hover:border-foreground/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {preview(c)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.transcript?.length ?? 0} messages</span>
                  {c.bookingId && (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    >
                      Booking created
                    </Badge>
                  )}
                  {c.rating && (
                    <Badge
                      variant="outline"
                      className="gap-0.5 border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      <Star className="size-3 fill-current" />
                      {c.rating}/5
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
