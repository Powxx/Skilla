"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherSubjectsClient({ teachers, subjects }: { teachers: any[], subjects: any[] }) {
  const router = useRouter();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const handleSelectTeacher = (id: string) => {
    setSelectedTeacherId(id);
    const teacher = teachers.find(t => t.id === id);
    if (teacher) {
      setSelectedSubjectIds(teacher.subjects.map((s: any) => s.id));
    }
  };

  const toggleSubject = (subjectId: string) => {
    if (selectedSubjectIds.includes(subjectId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== subjectId));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subjectId]);
    }
  };

  const handleSave = async () => {
    if (!selectedTeacherId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/teachers/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedTeacherId, subjectIds: selectedSubjectIds })
      });
      if (res.ok) {
        alert("Enregistré avec succès !");
        router.refresh();
      } else {
        alert("Erreur lors de l'enregistrement.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {/* Teacher List */}
      <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Professeurs</h2>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
import { MessageButton } from "@/components/chat/MessageButton";
// ... (le reste des imports)

// ... dans le JSX :
          {teachers.map(teacher => (
            <li key={teacher.id}>
              <div className="flex items-center gap-2">
                <button 
                    onClick={() => handleSelectTeacher(teacher.id)}
                    className={`flex-1 text-left px-4 py-3 transition ${selectedTeacherId === teacher.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                >
                    <div className="font-medium">{teacher.lastName} {teacher.firstName}</div>
                    <div className="text-xs text-slate-500 mt-1">{teacher.subjects.length} matière(s) assignée(s)</div>
                </button>
                <div className="pr-2">
                    <MessageButton recipientId={teacher.id} recipientName={`${teacher.lastName} ${teacher.firstName}`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Subjects Assignment */}
      <div className="md:col-span-2">
        {selectedTeacherId ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">
              Matières de {selectedTeacher?.lastName} {selectedTeacher?.firstName}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {subjects.map(subject => {
                const isSelected = selectedSubjectIds.includes(subject.id);
                return (
                  <label 
                    key={subject.id} 
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      checked={isSelected}
                      onChange={() => toggleSubject(subject.id)}
                    />
                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                      {subject.name}
                    </span>
                  </label>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500 flex items-center justify-center h-full">
            Sélectionnez un professeur pour gérer ses matières.
          </div>
        )}
      </div>
    </div>
  );
}
