"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface StudentSelectorProps {
  students: { id: string; label: string }[];
  currentId: string;
}

export default function StudentSelector({ students, currentId }: StudentSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (students.length <= 1) return null;

  const handleChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
      <label htmlFor="student-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        Sélectionner un élève :
      </label>
      <select
        id="student-select"
        className="text-sm border-none bg-transparent font-semibold text-blue-700 focus:ring-0 cursor-pointer"
        value={currentId}
        onChange={(e) => handleChange(e.target.value)}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
