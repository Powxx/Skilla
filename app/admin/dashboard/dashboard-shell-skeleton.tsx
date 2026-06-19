export default function DashboardShellSkeleton() {
  return (
    <div className="flex flex-col gap-8 font-sans text-slate-900 animate-pulse pb-10">
      <header className="space-y-2">
        <div className="h-8 w-72 bg-slate-200 rounded" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded" />
      </header>
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-32 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 flex-1 min-w-[140px] bg-white rounded-2xl border border-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200" />
        ))}
      </div>
    </div>
  );
}
