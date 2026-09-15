"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  LessonWithAttendancePayload, 
  updateStudentAttendance, 
  markAllStudentsPresent, 
  addStudentToCourseCard, 
  createAdminLessonRollCall,
  searchStudentsForCourseCard
} from "./actions";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  UserX, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Users, 
  BookOpen, 
  X,
  Filter,
  Check
} from "lucide-react";

type Props = {
  initialLessons: LessonWithAttendancePayload[];
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; firstName: string; lastName: string }>;
  rooms: Array<{ id: string; name: string }>;
};

export default function AdminAbsencesClient({
  initialLessons,
  classes,
  subjects,
  teachers,
  rooms
}: Props) {
  const [lessons, setLessons] = useState<LessonWithAttendancePayload[]>(initialLessons);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(initialLessons[0]?.id || null);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modal State: Create Roll Call
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassId, setNewClassId] = useState(classes[0]?.id || "");
  const [newSubjectId, setNewSubjectId] = useState(subjects[0]?.id || "");
  const [newTeacherId, setNewTeacherId] = useState(teachers[0]?.id || "");
  const [newRoomId, setNewRoomId] = useState(rooms[0]?.id || "");
  const [newStartTime, setNewStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'09:00"));
  const [newEndTime, setNewEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'11:00"));
  const [createLoading, setCreateLoading] = useState(false);

  // Modal State: Add Student to Card
  const [addStudentModalLessonId, setAddStudentModalLessonId] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<string>("");
  const [selectedStatusForCard, setSelectedStatusForCard] = useState<"PRESENT" | "ABSENT" | "LATE" | "EXCUSED">("PRESENT");
  const [addStudentLoading, setAddStudentLoading] = useState(false);

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    if (selectedClassId && lesson.classId !== selectedClassId) return false;
    
    if (selectedStatusFilter === "VALIDATED" && !lesson.isAttendanceValidated) return false;
    if (selectedStatusFilter === "PENDING" && lesson.isAttendanceValidated) return false;
    if (selectedStatusFilter === "WITH_ABSENCES" && lesson.absentCount === 0 && lesson.lateCount === 0) return false;

    if (dateFilter) {
      const lessonDate = format(new Date(lesson.startTime), "yyyy-MM-dd");
      if (lessonDate !== dateFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = lesson.subjectName.toLowerCase().includes(q);
      const matchClass = lesson.className.toLowerCase().includes(q);
      const matchTeacher = lesson.teacherName.toLowerCase().includes(q);
      const matchStudent = lesson.students.some(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
      if (!matchSubject && !matchClass && !matchTeacher && !matchStudent) return false;
    }

    return true;
  });

  // Global KPIs
  const totalLessons = lessons.length;
  const validatedCount = lessons.filter(l => l.isAttendanceValidated).length;
  const pendingCount = totalLessons - validatedCount;
  const totalAbsences = lessons.reduce((acc, l) => acc + l.absentCount, 0);
  const totalLates = lessons.reduce((acc, l) => acc + l.lateCount, 0);

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedCardId(prev => (prev === id ? null : id));
  };

  // Status Change for a Student inside a Card
  const handleStatusChange = async (
    lessonId: string, 
    studentId: string, 
    newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  ) => {
    // Optimistic Update
    setLessons(prev => prev.map(l => {
      if (l.id !== lessonId) return l;

      const updatedStudents = l.students.map(s => {
        if (s.studentId !== studentId) return s;
        return { ...s, status: newStatus };
      });

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      updatedStudents.forEach(s => {
        if (s.status === "PRESENT") presentCount++;
        else if (s.status === "ABSENT") absentCount++;
        else if (s.status === "LATE") lateCount++;
        else if (s.status === "EXCUSED") excusedCount++;
      });

      return {
        ...l,
        isAttendanceValidated: true,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        students: updatedStudents
      };
    }));

    try {
      await updateStudentAttendance(lessonId, studentId, newStatus);
    } catch (e: any) {
      alert("Erreur lors de la mise à jour: " + e.message);
    }
  };

  // Batch Mark All Present
  const handleMarkAllPresent = async (lessonId: string) => {
    setLessons(prev => prev.map(l => {
      if (l.id !== lessonId) return l;

      const updatedStudents = l.students.map(s => ({ ...s, status: "PRESENT" as const }));
      return {
        ...l,
        isAttendanceValidated: true,
        presentCount: updatedStudents.length,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        students: updatedStudents
      };
    }));

    try {
      await markAllStudentsPresent(lessonId);
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
  };

  // Create Admin Lesson Roll Call
  const handleCreateRollCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await createAdminLessonRollCall({
        classId: newClassId,
        subjectId: newSubjectId,
        teacherId: newTeacherId,
        roomId: newRoomId || undefined,
        startTime: newStartTime,
        endTime: newEndTime
      });
      if (res.ok) {
        setShowCreateModal(false);
        window.location.reload();
      } else {
        alert("Erreur: " + (res as any).error);
      }
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Search Students for Card Modal
  const handleSearchStudents = async (query: string) => {
    setStudentSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchStudentsForCourseCard(query);
    setSearchResults(results);
  };

  // Add Student to Card
  const handleAddStudentToCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentModalLessonId || !selectedStudentForCard) return;

    setAddStudentLoading(true);
    try {
      await addStudentToCourseCard(addStudentModalLessonId, selectedStudentForCard, selectedStatusForCard);
      setAddStudentModalLessonId(null);
      setSelectedStudentForCard("");
      setStudentSearchQuery("");
      window.location.reload();
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setAddStudentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">📋</span>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                Gestion des Appels & Absences
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Vue par cartes de cours : consultez les statistiques d'appel, déroulez les cours et enregistrez la présence des élèves.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau cours / Appel</span>
          </button>
        </div>

        {/* Global KPI Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Cours</p>
              <p className="text-xl font-black text-slate-900 mt-1">{totalLessons}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Appels Validés</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{validatedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Appels en Attente</p>
              <p className="text-xl font-black text-amber-600 mt-1">{pendingCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Absences & Retards</p>
              <p className="text-xl font-black text-red-600 mt-1">{totalAbsences + totalLates}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <UserX className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher cours, classe, élève..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Class Select */}
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Tous ({lessons.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "PENDING" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              À valider ({pendingCount})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("WITH_ABSENCES")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "WITH_ABSENCES" ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Absences
            </button>
          </div>
        </div>

        {/* Course Cards List */}
        {filteredLessons.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
            <p className="text-slate-400 font-bold text-sm">Aucune carte de cours ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filteredLessons.map((lesson) => {
              const isExpanded = expandedCardId === lesson.id;
              const formattedDate = format(new Date(lesson.startTime), "EEE dd MMM", { locale: fr });
              const formattedStartTime = format(new Date(lesson.startTime), "HH:mm");
              const formattedEndTime = format(new Date(lesson.endTime), "HH:mm");

              return (
                <div
                  key={lesson.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 shadow-sm overflow-hidden ${isExpanded ? "ring-2 ring-blue-500 border-blue-400 shadow-xl" : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"}`}
                >
                  {/* Card Header Top */}
                  <div
                    onClick={() => toggleExpand(lesson.id)}
                    className="p-5 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition border-b border-slate-100 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {lesson.className}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1 leading-tight">{lesson.subjectName}</h3>
                      </div>

                      {lesson.isAttendanceValidated ? (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider border border-emerald-200 shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Validé
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider border border-amber-200 animate-pulse shrink-0 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> À valider
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 font-medium space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formattedDate} • {formattedStartTime} - {formattedEndTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{lesson.teacherName} • Salle: {lesson.roomName}</span>
                      </div>
                    </div>

                    {/* Quick Indicator Pills on Card */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100/80 text-[10px] font-black">
                      {lesson.isAttendanceValidated ? (
                        <>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100" title="Présents">
                            🟢 {lesson.presentCount} Présent{lesson.presentCount > 1 ? 's' : ''}
                          </span>
                          <span className={`px-2 py-1 rounded-lg border ${lesson.absentCount > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-100 text-slate-500 border-slate-200"}`} title="Absents">
                            🔴 {lesson.absentCount} Absent{lesson.absentCount > 1 ? 's' : ''}
                          </span>
                          {lesson.lateCount > 0 && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-100" title="Retards">
                              🟧 {lesson.lateCount} Retard{lesson.lateCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {lesson.excusedCount > 0 && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100" title="Justifiés">
                              🔵 {lesson.excusedCount} Justifié{lesson.excusedCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded-lg border border-amber-200" title="Appel non réalisé">
                          ⏳ Appel non fait ({lesson.totalClassStudents} élèves à émarger)
                        </span>
                      )}
                    </div>

                    {/* Expand/Collapse Chevron Indicator */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 pt-1">
                      <span>{isExpanded ? "Masquer la liste des élèves" : `Voir l'appel (${lesson.totalClassStudents} élèves)`}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded Content: Student Roll Call Details */}
                  {isExpanded && (
                    <div className="p-5 bg-white space-y-4 animate-in slide-in-from-top duration-200">
                      {/* Card Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <button
                          onClick={() => handleMarkAllPresent(lesson.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" /> Tout marquer Présent
                        </button>

                        <button
                          onClick={() => {
                            setAddStudentModalLessonId(lesson.id);
                            setSelectedStudentForCard("");
                            setStudentSearchQuery("");
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Ajouter un élève
                        </button>
                      </div>

                      {/* Student Attendance List */}
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {lesson.students.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">Aucun élève trouvé dans ce cours.</p>
                        ) : (
                          lesson.students.map((student) => (
                            <div
                              key={student.studentId}
                              className="p-3 bg-slate-50/90 hover:bg-slate-100/90 rounded-2xl border border-slate-200/60 flex flex-col gap-2 transition shadow-sm"
                            >
                              {/* Nom de l'élève (au-dessus) */}
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 uppercase border border-blue-200">
                                  {student.formattedName ? student.formattedName.charAt(0) : '?'}
                                </div>
                                <span className="text-xs font-black text-slate-900 tracking-wide">
                                  {student.formattedName}
                                </span>
                              </div>

                              {/* Boutons de statut (en-dessous) */}
                              <div className="grid grid-cols-4 gap-1.5 w-full">
                                <button
                                  onClick={() => handleStatusChange(lesson.id, student.studentId, "PRESENT")}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] font-black transition uppercase text-center ${student.status === "PRESENT" ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600" : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"}`}
                                >
                                  Présent
                                </button>
                                <button
                                  onClick={() => handleStatusChange(lesson.id, student.studentId, "ABSENT")}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] font-black transition uppercase text-center ${student.status === "ABSENT" ? "bg-red-600 text-white shadow-sm ring-1 ring-red-600" : "bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-700"}`}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleStatusChange(lesson.id, student.studentId, "LATE")}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] font-black transition uppercase text-center ${student.status === "LATE" ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-500" : "bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700"}`}
                                >
                                  Retard
                                </button>
                                <button
                                  onClick={() => handleStatusChange(lesson.id, student.studentId, "EXCUSED")}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] font-black transition uppercase text-center ${student.status === "EXCUSED" ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600" : "bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700"}`}
                                >
                                  Justifié
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Admin Roll Call / Lesson */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-wider">Nouveau Cours / Appel Admin</h2>
              <p className="text-xs text-slate-500 font-medium mb-6">Programmez un nouveau cours pour effectuer l'appel des élèves.</p>

              <form onSubmit={handleCreateRollCall} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Classe</label>
                  <select
                    value={newClassId}
                    onChange={e => setNewClassId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Matière</label>
                  <select
                    value={newSubjectId}
                    onChange={e => setNewSubjectId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Enseignant</label>
                  <select
                    value={newTeacherId}
                    onChange={e => setNewTeacherId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Salle (Optionnelle)</label>
                  <select
                    value={newRoomId}
                    onChange={e => setNewRoomId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Non assignée --</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Début</label>
                    <input
                      type="datetime-local"
                      value={newStartTime}
                      onChange={e => setNewStartTime(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fin</label>
                    <input
                      type="datetime-local"
                      value={newEndTime}
                      onChange={e => setNewEndTime(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {createLoading ? "Création en cours..." : "Créer le cours"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Student to Card */}
        {addStudentModalLessonId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setAddStudentModalLessonId(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-wider">Ajouter un élève à cette carte</h2>
              <p className="text-xs text-slate-500 font-medium mb-4">Recherchez un élève à inscrire sur la feuille d'appel de ce cours.</p>

              <form onSubmit={handleAddStudentToCard} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rechercher l'élève</label>
                  <input
                    type="text"
                    placeholder="Tapez un nom..."
                    value={studentSearchQuery}
                    onChange={e => handleSearchStudents(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {searchResults.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentForCard(s.id);
                            setStudentSearchQuery(s.formattedName || `${(s.lastName || '').toUpperCase()} ${(s.firstName || '').charAt(0).toUpperCase()}.`);
                            setSearchResults([]);
                          }}
                          className="w-full text-left p-2.5 text-xs font-bold hover:bg-blue-50 transition flex justify-between items-center"
                        >
                          <span>{s.formattedName || `${(s.lastName || '').toUpperCase()} ${(s.firstName || '').charAt(0).toUpperCase()}.`}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{s.class?.name || "Sans classe"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Statut initial</label>
                  <select
                    value={selectedStatusForCard}
                    onChange={e => setSelectedStatusForCard(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="PRESENT">Présent</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Retard</option>
                    <option value="EXCUSED">Justifié</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={addStudentLoading || !selectedStudentForCard}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {addStudentLoading ? "Ajout..." : "Ajouter au cours"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
