"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { ABSENCE_MOTIFS } from "@/lib/absence-motifs";
import { 
  LessonWithAttendancePayload, 
  updateStudentAttendance, 
  markAllStudentsPresent, 
  addStudentToCourseCard, 
  createAdminLessonRollCall,
  searchStudentsForCourseCard,
  toggleConfirmAttendance,
  updateAttendanceJustification,
  finalizeLessonAttendance,
  finalizeMultipleLessonsAttendance
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
  Check,
  CheckCheck,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Inbox,
  RotateCcw,
  Sparkles
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
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get("status") || "ALL";

  const [lessons, setLessons] = useState<LessonWithAttendancePayload[]>(initialLessons);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(initialLessons[0]?.id || null);

  // Master View: ACTIVE (default: non finalisés), FINALIZED (finalisés), ALL (tous)
  const [finalizedView, setFinalizedView] = useState<"ACTIVE" | "FINALIZED" | "ALL">("ACTIVE");

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modal State: Confirmation de finalisation
  const [finalizeModalLesson, setFinalizeModalLesson] = useState<{
    lesson: LessonWithAttendancePayload;
    unconfirmedCount: number;
    unexcusedCount: number;
  } | null>(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  // Batch Finalization State
  const [batchFinalizeLoading, setBatchFinalizeLoading] = useState(false);

  // Floating Toast / Banner
  const [actionToast, setActionToast] = useState<{
    id: string;
    message: string;
    lessonId: string;
    isFinalized: boolean;
  } | null>(null);

  // Modal State: Justification avec Motifs
  const [justificationModal, setJustificationModal] = useState<{
    lessonId: string;
    studentId: string;
    studentName: string;
    currentReason?: string | null;
  } | null>(null);
  const [selectedMotif, setSelectedMotif] = useState<string>(ABSENCE_MOTIFS[0]);
  const [customDetails, setCustomDetails] = useState<string>("");
  const [justificationLoading, setJustificationLoading] = useState(false);

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

  // Auto-dismiss toast
  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => {
      setActionToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [actionToast]);

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    // Master Finalized View Filter
    if (finalizedView === "ACTIVE" && lesson.isAttendanceFinalized) return false;
    if (finalizedView === "FINALIZED" && !lesson.isAttendanceFinalized) return false;

    if (selectedClassId && lesson.classId !== selectedClassId) return false;
    
    if (selectedStatusFilter === "VALIDATED" && !lesson.isAttendanceValidated) return false;
    if (selectedStatusFilter === "PENDING" && lesson.isAttendanceValidated) return false;
    if (selectedStatusFilter === "WITH_ABSENCES" && lesson.absentCount === 0 && lesson.lateCount === 0) return false;
    if (selectedStatusFilter === "UNCONFIRMED" && !lesson.students.some(s => (s.status === "ABSENT" || s.status === "EXCUSED") && !s.isConfirmed)) return false;
    if (selectedStatusFilter === "CONFIRMED" && !lesson.students.some(s => (s.status === "ABSENT" || s.status === "EXCUSED") && s.isConfirmed)) return false;

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

  // KPI Calculations
  const activeLessons = lessons.filter(l => !l.isAttendanceFinalized);
  const finalizedLessons = lessons.filter(l => l.isAttendanceFinalized);

  const activeLessonsCount = activeLessons.length;
  const finalizedLessonsCount = finalizedLessons.length;

  const pendingTeacherCount = activeLessons.filter(l => !l.isAttendanceValidated).length;
  const activeAbsencesCount = activeLessons.reduce((acc, l) => acc + l.absentCount, 0);
  const activeLatesCount = activeLessons.reduce((acc, l) => acc + l.lateCount, 0);

  // Appels complets prêts à finaliser d'un coup (validés par le prof, 0 absent, 0 retard)
  const readyToFinalizeCount = activeLessons.filter(
    l => l.isAttendanceValidated && l.absentCount === 0 && l.lateCount === 0
  ).length;

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedCardId(prev => (prev === id ? null : id));
  };

  // Toggle Finalize Action
  const handleToggleFinalize = async (lessonId: string, newFinalized: boolean) => {
    const targetLesson = lessons.find(l => l.id === lessonId);
    
    // Optimistic Update
    setLessons(prev => prev.map(l => {
      if (l.id !== lessonId) return l;
      return {
        ...l,
        isAttendanceFinalized: newFinalized,
        attendanceFinalizedAt: newFinalized ? new Date().toISOString() : null,
        isAttendanceValidated: newFinalized ? true : l.isAttendanceValidated
      };
    }));

    setActionToast({
      id: `${lessonId}-${Date.now()}`,
      message: newFinalized
        ? `L'appel « ${targetLesson?.subjectName || "Cours"} » (${targetLesson?.className || ""}) a été finalisé et retiré de la liste.`
        : `L'appel « ${targetLesson?.subjectName || "Cours"} » a été rouvert et réintégré dans la liste à traiter.`,
      lessonId,
      isFinalized: newFinalized
    });

    try {
      await finalizeLessonAttendance(lessonId, newFinalized);
    } catch (e: any) {
      // Revert on error
      setLessons(prev => prev.map(l => {
        if (l.id !== lessonId) return l;
        return {
          ...l,
          isAttendanceFinalized: !newFinalized,
          attendanceFinalizedAt: !newFinalized ? new Date().toISOString() : null
        };
      }));
      alert("Erreur lors de la mise à jour de l'appel : " + e.message);
    }
  };

  // Prompt Finalize (check if unconfirmed or pending teacher)
  const handlePromptFinalize = (lesson: LessonWithAttendancePayload) => {
    const unconfirmedCount = lesson.students.filter(
      s => (s.status === "ABSENT" || s.status === "EXCUSED") && !s.isConfirmed
    ).length;
    const unexcusedCount = lesson.students.filter(
      s => s.status === "ABSENT" && !s.reason
    ).length;

    if (unconfirmedCount > 0 || unexcusedCount > 0 || !lesson.isAttendanceValidated) {
      setFinalizeModalLesson({
        lesson,
        unconfirmedCount,
        unexcusedCount
      });
    } else {
      handleToggleFinalize(lesson.id, true);
    }
  };

  // Batch Finalize Clean Calls
  const handleBatchFinalizeClean = async () => {
    const cleanLessonIds = activeLessons
      .filter(l => l.isAttendanceValidated && l.absentCount === 0 && l.lateCount === 0)
      .map(l => l.id);

    if (cleanLessonIds.length === 0) return;

    if (!confirm(`Confirmez-vous la finalisation de ces ${cleanLessonIds.length} appels complets sans absence ? Ils seront archivés et disparaîtront de la liste à traiter.`)) {
      return;
    }

    setBatchFinalizeLoading(true);

    // Optimistic Update
    setLessons(prev => prev.map(l => {
      if (!cleanLessonIds.includes(l.id)) return l;
      return {
        ...l,
        isAttendanceFinalized: true,
        attendanceFinalizedAt: new Date().toISOString()
      };
    }));

    try {
      await finalizeMultipleLessonsAttendance(cleanLessonIds, true);
      setActionToast({
        id: `batch-${Date.now()}`,
        message: `${cleanLessonIds.length} appels sans absence ont été finalisés avec succès !`,
        lessonId: cleanLessonIds[0],
        isFinalized: true
      });
    } catch (e: any) {
      alert("Erreur lors de la finalisation groupée : " + e.message);
    } finally {
      setBatchFinalizeLoading(false);
    }
  };

  const handleToggleConfirm = async (lessonId: string, studentId: string, currentConfirmed: boolean) => {
    const newConfirmed = !currentConfirmed;
    
    setLessons(prev => prev.map(l => {
      if (l.id !== lessonId) return l;
      const updatedStudents = l.students.map(s => {
        if (s.studentId !== studentId) return s;
        return { ...s, isConfirmed: newConfirmed };
      });
      return { ...l, students: updatedStudents };
    }));

    try {
      await toggleConfirmAttendance(lessonId, studentId, newConfirmed);
    } catch (e: any) {
      alert("Erreur lors de la confirmation: " + e.message);
    }
  };

  const handleOpenJustificationModal = (lessonId: string, studentId: string, studentName: string, currentReason?: string | null) => {
    let initialMotif: string = ABSENCE_MOTIFS[0];
    let initialDetails = "";

    if (currentReason) {
      const foundMotif = ABSENCE_MOTIFS.find(m => currentReason.startsWith(m));
      if (foundMotif) {
        initialMotif = foundMotif;
        initialDetails = currentReason.replace(foundMotif, "").replace(/^\s*[—:-]\s*/, "").trim();
      } else {
        initialMotif = ABSENCE_MOTIFS[ABSENCE_MOTIFS.length - 1];
        initialDetails = currentReason;
      }
    }

    setSelectedMotif(initialMotif);
    setCustomDetails(initialDetails);
    setJustificationModal({ lessonId, studentId, studentName, currentReason });
  };

  const handleSaveJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationModal) return;

    setJustificationLoading(true);
    const fullReason = customDetails.trim() 
      ? `${selectedMotif} — ${customDetails.trim()}`
      : selectedMotif;

    try {
      await updateAttendanceJustification(
        justificationModal.lessonId,
        justificationModal.studentId,
        fullReason,
        "EXCUSED",
        true
      );

      setLessons(prev => prev.map(l => {
        if (l.id !== justificationModal.lessonId) return l;

        const updatedStudents = l.students.map(s => {
          if (s.studentId !== justificationModal.studentId) return s;
          return {
            ...s,
            status: "EXCUSED" as const,
            reason: fullReason,
            isConfirmed: true
          };
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

      setJustificationModal(null);
    } catch (e: any) {
      alert("Erreur lors de l'enregistrement: " + e.message);
    } finally {
      setJustificationLoading(false);
    }
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
          <div 
            onClick={() => setFinalizedView("ACTIVE")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-sm flex items-center justify-between ${
              finalizedView === "ACTIVE" 
                ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20" 
                : "bg-white border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">À traiter</p>
                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md">En cours</span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">{activeLessonsCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">Appels non clôturés</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Inbox className="h-5 w-5" />
            </div>
          </div>

          <div 
            onClick={() => setFinalizedView("FINALIZED")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-sm flex items-center justify-between ${
              finalizedView === "FINALIZED" 
                ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20" 
                : "bg-white border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Finalisés</p>
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">Archivés</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-1">{finalizedLessonsCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">Appels clôturés</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">En attente prof</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendingTeacherCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">Non validés par l'enseignant</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Absences & Retards</p>
              <p className="text-2xl font-black text-red-600 mt-1">{activeAbsencesCount + activeLatesCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">{activeAbsencesCount} abs. • {activeLatesCount} retards</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <UserX className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Master View Switcher & Quick Batch Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFinalizedView("ACTIVE")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                finalizedView === "ACTIVE"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Inbox className="h-3.5 w-3.5 text-blue-600" />
              <span>À traiter</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                finalizedView === "ACTIVE" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
              }`}>
                {activeLessonsCount}
              </span>
            </button>

            <button
              onClick={() => setFinalizedView("FINALIZED")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                finalizedView === "FINALIZED"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Archive className="h-3.5 w-3.5 text-emerald-600" />
              <span>Finalisés</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                finalizedView === "FINALIZED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
              }`}>
                {finalizedLessonsCount}
              </span>
            </button>

            <button
              onClick={() => setFinalizedView("ALL")}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                finalizedView === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Tous</span>
              <span className="text-[10px] text-slate-400 font-bold">({lessons.length})</span>
            </button>
          </div>

          {/* Quick Batch Action: Finalize clean calls without absences */}
          {finalizedView === "ACTIVE" && readyToFinalizeCount > 0 && (
            <button
              onClick={handleBatchFinalizeClean}
              disabled={batchFinalizeLoading}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Finaliser {readyToFinalizeCount} appel{readyToFinalizeCount > 1 ? 's' : ''} sans absence</span>
            </button>
          )}
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
              Tous ({filteredLessons.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "PENDING" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              À valider prof
            </button>
            <button
              onClick={() => setSelectedStatusFilter("WITH_ABSENCES")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "WITH_ABSENCES" ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Absences & Retards
            </button>
            <button
              onClick={() => setSelectedStatusFilter("UNCONFIRMED")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "UNCONFIRMED" ? "bg-amber-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              À valider admin
            </button>
            <button
              onClick={() => setSelectedStatusFilter("CONFIRMED")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${selectedStatusFilter === "CONFIRMED" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Confirmées
            </button>
          </div>
        </div>

        {/* Course Cards List */}
        {filteredLessons.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-2xl mx-auto my-6">
            {finalizedView === "ACTIVE" ? (
              <div className="space-y-4">
                <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                  🎉
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                    Tous les appels sont à jour !
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Il n'y a aucun appel en attente de traitement. Tous les appels effectués ont été finalisés et archivés.
                  </p>
                </div>
                {finalizedLessonsCount > 0 && (
                  <button
                    onClick={() => setFinalizedView("FINALIZED")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm"
                  >
                    <Archive className="h-4 w-4" />
                    <span>Consulter les {finalizedLessonsCount} appels finalisés</span>
                  </button>
                )}
              </div>
            ) : finalizedView === "FINALIZED" ? (
              <div className="space-y-3">
                <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Archive className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-black text-slate-700 uppercase">Aucun appel finalisé</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Une fois les présences traitées dans l'onglet « À traiter », cliquez sur le bouton « Finaliser » pour les archiver ici.
                </p>
                <button
                  onClick={() => setFinalizedView("ACTIVE")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Revenir aux appels à traiter</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <BookOpen className="h-6 w-6" />
                </div>
                <p className="text-slate-400 font-bold text-sm">Aucune carte de cours ne correspond aux filtres sélectionnés.</p>
              </div>
            )}
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
                  className={`bg-white rounded-3xl border transition-all duration-300 shadow-sm overflow-hidden ${
                    isExpanded 
                      ? "ring-2 ring-blue-500 border-blue-400 shadow-xl" 
                      : lesson.isAttendanceFinalized
                        ? "border-slate-200/60 opacity-90 hover:opacity-100 hover:border-slate-300 hover:shadow-md"
                        : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  {/* Card Header Top */}
                  <div
                    onClick={() => toggleExpand(lesson.id)}
                    className="p-5 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition border-b border-slate-100 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {lesson.className}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1 leading-tight truncate" title={lesson.subjectName}>
                          {lesson.subjectName}
                        </h3>
                      </div>

                      {/* Header Actions & Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {lesson.isAttendanceFinalized ? (
                          <>
                            <span className="text-[9px] font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider border border-slate-200 flex items-center gap-1 shrink-0">
                              <CheckCheck className="h-3 w-3 text-emerald-600" /> Finalisé
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFinalize(lesson.id, false);
                              }}
                              title="Rouvrir cet appel et le réintégrer dans la liste à traiter"
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200 shadow-xs transition flex items-center gap-1"
                            >
                              <RotateCcw className="h-2.5 w-2.5" /> Rouvrir
                            </button>
                          </>
                        ) : (
                          <>
                            {lesson.isAttendanceValidated ? (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider border border-emerald-200 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Validé
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider border border-amber-200 animate-pulse shrink-0 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> À valider prof
                              </span>
                            )}

                            {/* Prominent Quick Finalize button in card header */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromptFinalize(lesson);
                              }}
                              title="Finaliser l'appel et le retirer de la liste principale"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm shadow-emerald-600/20 transition flex items-center gap-1 active:scale-95"
                            >
                              <CheckCheck className="h-3 w-3" /> Finaliser
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formattedDate} • {formattedStartTime} - {formattedEndTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{lesson.teacherName} • Salle: {lesson.roomName}</span>
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
                        <div className="flex flex-wrap items-center gap-2">
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

                        <div>
                          {lesson.isAttendanceFinalized ? (
                            <button
                              onClick={() => handleToggleFinalize(lesson.id, false)}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Rouvrir l'appel
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePromptFinalize(lesson)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition flex items-center gap-1.5 active:scale-95"
                            >
                              <CheckCheck className="h-3.5 w-3.5" /> Finaliser l'appel
                            </button>
                          )}
                        </div>
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
                              {/* Nom de l'élève & Statut d'administration */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 uppercase border border-blue-200">
                                    {student.formattedName ? student.formattedName.charAt(0) : '?'}
                                  </div>
                                  <span className="text-xs font-black text-slate-900 tracking-wide truncate max-w-[160px] sm:max-w-none" title={student.formattedName}>
                                    {student.formattedName}
                                  </span>
                                </div>

                                {/* Badge de confirmation administrative pour absence / retard */}
                                {(student.status === "ABSENT" || student.status === "EXCUSED" || student.status === "LATE") && (
                                  <div className="flex items-center gap-1.5">
                                    {student.isConfirmed ? (
                                      <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 shrink-0">
                                        <ShieldCheck className="h-3 w-3" /> Confirmée admin
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 shrink-0">
                                        <ShieldAlert className="h-3 w-3" /> Non confirmée
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Affichage du motif de justification s'il existe */}
                              {student.reason && (
                                <p className="text-[10px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl font-medium italic border border-slate-200/60 flex items-center gap-1.5">
                                  <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{student.reason}</span>
                                </p>
                              )}

                              {/* Boutons de statut principal */}
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
                                  onClick={() => handleOpenJustificationModal(lesson.id, student.studentId, student.formattedName || `${student.lastName} ${student.firstName}`, student.reason)}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] font-black transition uppercase text-center ${student.status === "EXCUSED" ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600" : "bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700"}`}
                                >
                                  {student.status === "EXCUSED" ? "Justifié" : "Justifier"}
                                </button>
                              </div>

                              {/* Actions de suivi et justification pour l'administration */}
                              {(student.status === "ABSENT" || student.status === "EXCUSED" || student.status === "LATE") && (
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenJustificationModal(lesson.id, student.studentId, student.formattedName || `${student.lastName} ${student.firstName}`, student.reason)}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {student.reason ? "Modifier motif" : "+ Motif justification"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleConfirm(lesson.id, student.studentId, student.isConfirmed ?? false)}
                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                                      student.isConfirmed 
                                        ? "bg-slate-200 hover:bg-slate-300 text-slate-700" 
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    }`}
                                  >
                                    {student.isConfirmed ? "Déconfirmer" : "✓ Confirmer l'absence"}
                                  </button>
                                </div>
                              )}
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
                            setStudentSearchQuery(s.formattedName || `${(s.lastName || '').toUpperCase()} ${s.firstName || ''}`);
                            setSearchResults([]);
                          }}
                          className="w-full text-left p-2.5 text-xs font-bold hover:bg-blue-50 transition flex justify-between items-center"
                        >
                          <span className="truncate max-w-[200px]" title={s.formattedName || `${(s.lastName || '').toUpperCase()} ${s.firstName || ''}`}>{s.formattedName || `${(s.lastName || '').toUpperCase()} ${s.firstName || ''}`}</span>
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

        {/* Modal: Justification d'absence avec Motifs */}
        {justificationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setJustificationModal(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Justifier une absence</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Sélectionnez le motif et saisissez un commentaire pour <strong className="text-slate-900">{justificationModal.studentName}</strong>.
              </p>

              <form onSubmit={handleSaveJustification} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Motif de justification</label>
                  <select
                    value={selectedMotif}
                    onChange={e => setSelectedMotif(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {ABSENCE_MOTIFS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Précisions ou commentaire (Optionnel)</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Certificat médical fourni par le médecin..."
                    value={customDetails}
                    onChange={e => setCustomDetails(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setJustificationModal(null)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={justificationLoading}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {justificationLoading ? "Enregistrement..." : "Valider & Justifier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirmation de finalisation avec alertes si absences non confirmées */}
        {finalizeModalLesson && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setFinalizeModalLesson(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wide leading-tight">
                    Finaliser cet appel ?
                  </h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    {finalizeModalLesson.lesson.className} • {finalizeModalLesson.lesson.subjectName}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium my-3 leading-relaxed">
                Cet appel comporte encore des éléments nécessitant votre attention :
              </p>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2 mb-5 text-xs text-amber-900 font-medium">
                {!finalizeModalLesson.lesson.isAttendanceValidated && (
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0">⚠️</span>
                    <span>L'enseignant n'a pas encore validé l'appel pour ce cours.</span>
                  </div>
                )}
                {finalizeModalLesson.unconfirmedCount > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0">⚠️</span>
                    <span><strong>{finalizeModalLesson.unconfirmedCount} absence(s)</strong> ne sont pas encore confirmées par l'administration.</span>
                  </div>
                )}
                {finalizeModalLesson.unexcusedCount > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0">ℹ️</span>
                    <span><strong>{finalizeModalLesson.unexcusedCount} absence(s)</strong> n'ont pas encore de motif de justification enregistré.</span>
                  </div>
                )}
                <p className="text-[10px] text-amber-700/90 pt-2 border-t border-amber-200/60">
                  En finalisant, cet appel disparaîtra de la liste principale « À traiter » pour libérer votre espace de travail. Vous pourrez le consulter ou le rouvrir à tout moment dans l'onglet « Finalisés ».
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFinalizeModalLesson(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = finalizeModalLesson.lesson.id;
                    setFinalizeModalLesson(null);
                    handleToggleFinalize(id, true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  Confirmer la finalisation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Notification Toast with Instant Undo */}
        {actionToast && (
          <div className="fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCheck className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold flex-1 leading-snug">{actionToast.message}</p>
            <button
              onClick={() => {
                handleToggleFinalize(actionToast.lessonId, !actionToast.isFinalized);
                setActionToast(null);
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition shrink-0"
            >
              Annuler
            </button>
            <button
              onClick={() => setActionToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
