import Link from "next/link";

const modules = [
  {
    title: "Chat",
    description: "Talk to the booking agent directly via text chat.",
    status: "Available",
    href: "/chat",
  },
  {
    title: "Bookings",
    description: "View and manage collected booking requests.",
    status: "Phase 5–6",
  },
  {
    title: "Live Transcript",
    description: "Real-time conversation transcript view via Socket.IO.",
    status: "Phase 6",
  },
  {
    title: "Call History",
    description: "Browse past call sessions and outcomes.",
    status: "Phase 6",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">BrainStack Booking Agent</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Admin dashboard — Phase 1 project foundation
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-4xl">
        {modules.map((mod) => {
          const card = (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-1 h-full transition-colors hover:border-gray-400 dark:hover:border-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{mod.title}</h2>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    mod.status === "Available"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {mod.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mod.description}
              </p>
            </div>
          );

          return mod.href ? (
            <Link key={mod.title} href={mod.href}>
              {card}
            </Link>
          ) : (
            <div key={mod.title}>{card}</div>
          );
        })}
      </div>
    </main>
  );
}
