import type { ChatTurn } from "@/lib/api";

export function TranscriptView({ transcript }: { transcript?: ChatTurn[] }) {
  if (!transcript || transcript.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No transcript recorded for this conversation.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transcript.map((turn, i) => {
        const isUser = turn.role === "user";
        return (
          <div
            key={i}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                isUser
                  ? "bg-[#d9fdd3] text-gray-900 dark:bg-[#005c4b] dark:text-white"
                  : "bg-white text-gray-900 shadow-sm dark:bg-[#202c33] dark:text-white"
              }`}
            >
              {turn.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
