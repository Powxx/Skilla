export default function UsersShellSkeleton() {
  return (
    <div className="h-full flex flex-col gap-6 font-sans text-slate-900 animate-pulse">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase tracking-widest text-slate-900">
            Utilisateurs & Droits
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gestion des comptes et profils d'accès
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-24 bg-slate-200 rounded-xl" />
          <div className="h-8 w-24 bg-sky-100 rounded-xl" />
          <div className="h-8 w-24 bg-slate-800 rounded-xl" />
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-end gap-3 shrink-0">
        <div className="flex-1 w-full">
          <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
          <div className="h-10 w-full bg-slate-100 rounded-xl" />
        </div>
        <div className="w-full sm:w-44">
          <div className="h-3 w-12 bg-slate-200 rounded mb-2" />
          <div className="h-10 w-full bg-slate-100 rounded-xl" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-10 w-20 bg-blue-200 rounded-xl" />
          <div className="h-10 w-16 bg-slate-100 rounded-xl" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex gap-4 items-center w-full">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-4 w-48 bg-slate-100 rounded hidden sm:block" />
                <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
