export default function CalligraphyFlowPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans">
            <h1 className="text-4xl font-black text-slate-900 mb-8">Calligraphy Flow (Work in Progress)</h1>
            <div className="w-full max-w-lg h-96 bg-white border-2 border-slate-200 rounded-3xl shadow-inner flex items-center justify-center">
                <p className="text-slate-400 font-bold uppercase tracking-widest">Zone de tracé à venir</p>
            </div>
            <div className="mt-8">
                <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest">
                    Commencer l'entraînement
                </button>
            </div>
        </div>
    );
}
