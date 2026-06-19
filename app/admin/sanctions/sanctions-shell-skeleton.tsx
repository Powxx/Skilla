export default function SanctionsShellSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans animate-pulse">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 h-3 w-48 bg-slate-200 rounded" />
        <header className="mb-8 space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-4 w-96 max-w-full bg-slate-100 rounded" />
        </header>
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-slate-200 pb-3">
            <div className="h-8 w-32 bg-slate-200 rounded" />
            <div className="h-8 w-28 bg-slate-100 rounded" />
          </div>
          <div className="h-14 bg-white rounded-2xl border border-slate-200" />
          <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-4 flex-1 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
