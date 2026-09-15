"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { Stethoscope } from "lucide-react";

function subscribeNever() {
  return () => {};
}

function getSpeechSupportSnapshot() {
  return (
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition) &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function getSpeechSupportServerSnapshot() {
  return false;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  bookingCreated?: boolean;
  kind?: "voice";
  audioUrl?: string;
  durationSec?: number;
}

interface ChatApiResponse {
  sessionId: string;
  reply: string;
  bookingCreated: boolean;
  booking?: { id: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "greeting",
      role: "model",
      text: "Hi, thanks for reaching out to BrainStack! I can help you book an appointment with one of our doctors. What brings you in today?",
      timestamp: Date.now(),
    },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<InstanceType<
    NonNullable<typeof window.SpeechRecognition>
  > | null>(null);
  const finalTranscriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // useSyncExternalStore (not state+effect) so the server snapshot (false)
  // and the client's first paint agree — reading `window` during render
  // directly would desync SSR vs. client output and break hydration.
  const speechSupported = useSyncExternalStore(
    subscribeNever,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isRecording]);

  // Release the mic / recognition session if the user navigates away mid-recording.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    };
  }, []);

  async function submitMessage(
    text: string,
    voiceMeta?: { audioUrl: string; durationSec: number },
  ) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
        ...(voiceMeta ? { kind: "voice" as const, ...voiceMeta } : {}),
      },
    ]);
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
      const replyId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: "model",
          text: data.reply,
          bookingCreated: data.bookingCreated,
          timestamp: Date.now(),
        },
      ]);
      if (autoSpeak) speak(replyId, data.reply);
    } catch {
      setError(
        "Couldn't reach the clinic assistant. Is the API running and is GROQ_API_KEY set?",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  function speak(id: string, text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    if (!speechSupported || isRecording || loading) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      const RecognitionCtor =
        window.SpeechRecognition ?? window.webkitSpeechRecognition!;
      const recognition = new RecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      finalTranscriptRef.current = "";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const piece = result[0].transcript;
          if (result.isFinal) {
            finalTranscriptRef.current += piece + " ";
          } else {
            interim += piece;
          }
        }
        setLiveTranscript((finalTranscriptRef.current + interim).trim());
      };
      recognition.onerror = () => {};
      recognitionRef.current = recognition;
      recognition.start();

      setRecordSeconds(0);
      setLiveTranscript("");
      setIsRecording(true);
      timerRef.current = setInterval(
        () => setRecordSeconds((s) => s + 1),
        1000,
      );
    } catch {
      setError("Microphone permission denied or unavailable.");
    }
  }

  function stopRecording(shouldSend: boolean) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    const durationSec = recordSeconds;
    const transcript = finalTranscriptRef.current.trim() || liveTranscript;

    const finish = () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (shouldSend) {
        if (!transcript) {
          setError(
            "Couldn't understand the recording — try again or type your message.",
          );
        } else {
          const blob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          submitMessage(transcript, {
            audioUrl: URL.createObjectURL(blob),
            durationSec,
          });
        }
      }
    };

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = finish;
      recorder.stop();
    } else {
      finish();
    }

    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
    setLiveTranscript("");
  }

  function handlePrimaryButtonClick() {
    if (input.trim()) {
      submitMessage(input);
    } else {
      startRecording();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 bg-[#0e7490] px-4 py-3 text-white shadow-sm dark:bg-[#0b3f4d]">
        <Link
          href="/"
          aria-label="Back to home"
          className="-ml-1 rounded-full p-1.5 hover:bg-white/10"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Stethoscope className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-medium">
            BrainStack AI Receptionist
          </h1>
          <p className="flex items-center gap-1.5 truncate text-xs text-white/80">
            {!loading && (
              <span className="rec-dot inline-block size-1.5 shrink-0 rounded-full bg-emerald-300" />
            )}
            {loading ? "typing…" : "online"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAutoSpeak((v) => !v)}
          title={
            autoSpeak
              ? "Auto-speak replies: on — click to turn off"
              : "Auto-speak replies: off — click to turn on"
          }
          className={`rounded-full p-2 hover:bg-white/10 ${autoSpeak ? "text-white" : "text-white/50"}`}
        >
          <SpeakerIcon muted={!autoSpeak} />
        </button>
      </header>

      <div className="medical-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[65%] ${
                    isUser
                      ? "bubble-tail-med-out bg-[#dff3f8] text-gray-900 dark:bg-[#0b4a5c] dark:text-white"
                      : "bubble-tail-med-in bg-white text-gray-900 dark:bg-[#102b34] dark:text-white"
                  }`}
                >
                  {m.kind === "voice" ? (
                    <VoiceBubble message={m} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  )}
                  {m.bookingCreated && (
                    <div className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
                      ✓ Appointment booked
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => speak(m.id, m.text)}
                        title="Listen"
                        className="mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {speakingId === m.id ? (
                          <SpeakerIcon size={13} playing />
                        ) : (
                          <SpeakerIcon size={13} />
                        )}
                      </button>
                    )}
                    <span>{formatTime(m.timestamp)}</span>
                    {isUser && <CheckDoubleIcon />}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && <TypingBubble />}
          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="border-t border-black/10 bg-[#eaf4f7] p-3 dark:border-white/10 dark:bg-[#0e2830]">
        <div className="mx-auto max-w-2xl">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => stopRecording(false)}
                title="Cancel"
                className="shrink-0 rounded-full p-2.5 text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <TrashIcon />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm dark:bg-[#12313b]">
                <span className="rec-dot h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <span className="shrink-0 tabular-nums text-gray-600 dark:text-gray-300">
                  {formatDuration(recordSeconds)}
                </span>
                <span className="truncate italic text-gray-400 dark:text-gray-500">
                  {liveTranscript || "Listening…"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                title="Send"
                className="shrink-0 rounded-full bg-[#0891b2] p-2.5 text-white hover:bg-[#0e7490]"
              >
                <SendIcon />
              </button>
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                disabled={loading}
                className="flex-1 rounded-full border border-transparent bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2] dark:bg-[#12313b] dark:text-white"
              />
              <button
                type="button"
                onClick={handlePrimaryButtonClick}
                disabled={loading || (!input.trim() && !speechSupported)}
                title={
                  !input.trim() && !speechSupported
                    ? "Voice input isn't supported in this browser — try Chrome or Edge"
                    : undefined
                }
                className="shrink-0 rounded-full bg-[#0891b2] p-2.5 text-white hover:bg-[#0e7490] disabled:opacity-40"
              >
                {input.trim() ? <SendIcon /> : <MicIcon />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function VoiceBubble({ message }: { message: ChatMessage }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  }

  return (
    <div className="flex min-w-47.5 flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0891b2] text-white"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="h-1 flex-1 rounded-full bg-black/10 dark:bg-white/10" />
        <span className="shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400">
          {formatDuration(message.durationSec ?? 0)}
        </span>
      </div>
      {message.text && (
        <p className="text-xs italic text-gray-500 dark:text-gray-400">
          {message.text}
        </p>
      )}
      <audio
        ref={audioRef}
        src={message.audioUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bubble-tail-med-in flex items-center gap-1 rounded-lg bg-white px-3 py-3 shadow-sm dark:bg-[#102b34]">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0891b2]/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0891b2]/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0891b2]/60" />
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.08A7 7 0 0019 11z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.6L22 12 3.4 3.4 3 10l12 2-12 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function CheckDoubleIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="text-[#53bdeb]">
      <path d="M1 5.5L4.5 9 11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 5.5L9 9 15.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeakerIcon({
  muted,
  playing,
  size = 20,
}: {
  muted?: boolean;
  playing?: boolean;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      {!muted && (
        <path
          d={
            playing
              ? "M16 8a5 5 0 010 8m2.5-10.5a8 8 0 010 13"
              : "M16 8a5 5 0 010 8"
          }
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {muted && (
        <path
          d="M17 9l4 6m0-6l-4 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
