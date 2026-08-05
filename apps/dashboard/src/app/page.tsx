const modules = [
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

      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-3xl">
        {modules.map((mod) => (
          <div
            key={mod.title}
            className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-1"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{mod.title}</h2>
              <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                {mod.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mod.description}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
