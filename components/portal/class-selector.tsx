"use client";

import { useRouter } from "next/navigation";

type ClassOption = {
  id: string;
  name: string;
};

type Props = {
  classes: ClassOption[];
  selectedClassId?: string;
  baseUrl: string;
};

export default function ClassSelector({ classes, selectedClassId, baseUrl }: Props) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      router.push(`${baseUrl}?classId=${val}`);
    } else {
      router.push(baseUrl);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <label htmlFor="class-select" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
        Sélectionner une classe
      </label>
      <select
        id="class-select"
        value={selectedClassId || ""}
        onChange={handleChange}
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition cursor-pointer"
      >
        <option value="">-- Choisir une classe --</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>
    </div>
  );
}
