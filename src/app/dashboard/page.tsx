import FeaturesSectionDemo from "@/components/features-section-demo-3";

export default function DashboardPage() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
            Overview
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Welcome back to the Sentinel Dashboard
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <FeaturesSectionDemo />
      </div>
    </div>
  );
}
