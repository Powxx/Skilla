export default function SanctionsPortalSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-pulse">
      <div className="mb-6 h-3 w-40 bg-slate-200 rounded" />
      <header className="mb-8 space-y-2">
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="h-4 w-80 max-w-full bg-slate-100 rounded" />
      </header>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div className="flex gap-3">
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
            <div className="h-16 bg-slate-50 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
