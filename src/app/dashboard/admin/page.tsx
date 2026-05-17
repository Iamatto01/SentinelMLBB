"use client";

export default function AdminPage() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
          Admin Panel
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">Manage users, settings, and data</p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Admin Tools</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-md">
            User management, data import/export, and system configuration will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
