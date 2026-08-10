"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  bookingCreated?: boolean;
}

interface ChatApiResponse {
  sessionId: string;
  reply: string;
  bookingCreated: boolean;
  booking?: { id: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Hi, thanks for calling BrainStack! I can help you book a service appointment. What can I help you book today?",
    },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data: ChatApiResponse = await res.json();
      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.reply,
          bookingCreated: data.bookingCreated,
        },
      ]);
    } catch {
      setError(
        "Couldn't reach the booking agent. Is the API running and is GEMINI_API_KEY set?",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-4">
      <div className="w-full max-w-2xl flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:underline w-fit"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Booking Chat</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Talk to the BrainStack booking agent — text version of the voice
          flow.
        </p>
      </div>

      <div className="w-full max-w-2xl flex-1 flex flex-col rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[50vh] max-h-[60vh]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {m.text}
                {m.bookingCreated && (
                  <div className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                    ✓ Booking saved
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Typing…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-800">
            {error}
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="flex gap-2 border-t border-gray-200 dark:border-gray-800 p-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
