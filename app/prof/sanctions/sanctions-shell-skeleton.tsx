export default function ProfSanctionsShellSkeleton() {
  return (
    <div className="min-h-[80vh] flex flex-col gap-6 font-sans text-slate-900 pb-10 animate-pulse">
      <header className="space-y-2">
        <div className="h-6 w-56 bg-slate-200 rounded" />
        <div className="h-3 w-80 max-w-full bg-slate-100 rounded" />
      </header>
      <div className="h-14 bg-white rounded-2xl border border-slate-200" />
      <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-4 flex-1 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
