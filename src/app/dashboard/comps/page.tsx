"use client";

export default function CompsPage() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
          Team Comps
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Team composition analysis coming soon
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12">
        <div className="text-center">
          <div className="text-6xl mb-4">⚔️</div>
          <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Coming Soon</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-md">
            Team composition analytics will analyze your squad formations, synergy scores, and suggest optimal hero combinations based on your match history.
          </p>
        </div>
      </div>
    </div>
  );
}
