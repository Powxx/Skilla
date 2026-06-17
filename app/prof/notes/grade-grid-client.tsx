"use client";

import React, { useState, useTransition } from "react";
import { getClassDetailsForGrading } from "./actions";
import { saveGradesBatch } from "@/app/actions/notes";

export default function GradeGridClient({ classes, teacherId, subjectId }: { classes: any[], teacherId: string, subjectId: string }) {
    const [classData, setClassData] = useState<any>(null);
    const [loading, startTransition] = useTransition();

    const loadClass = (classId: string) => {
        startTransition(async () => {
            const data = await getClassDetailsForGrading(classId, teacherId);
            setClassData(data);
        });
    };

    const handleSaveNote = async (studentId: string, note: string, comment: string) => {
        const val = parseFloat(note);
        if (isNaN(val)) return;

        const res = await saveGradesBatch([{
            studentId,
            note: val,
            matiereId: subjectId,
            coefficient: 1,
            comment: comment
        }]);

        if (!res.ok) alert("Erreur lors de la sauvegarde : " + res.error);
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-center">
                <select onChange={(e) => loadClass(e.target.value)} className="p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500">
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {loading && <div className="text-slate-500 animate-pulse">Chargement...</div>}

            {classData && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Élève</th>
                                <th className="px-6 py-4">Note (/20)</th>
                                <th className="px-6 py-4">Commentaire</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {classData.students.map((student: any) => (
                                <tr key={student.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{student.lastName} {student.firstName}</td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="number" 
                                            className="w-16 p-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                            placeholder="—"
                                            onBlur={(e) => handleSaveNote(student.id, e.target.value, "")}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:border-sky-500"
                                            placeholder="Commentaire..."
                                            onBlur={(e) => handleSaveNote(student.id, "", e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
