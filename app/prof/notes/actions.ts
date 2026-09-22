"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getEffectiveTeacherId } from "@/lib/teacher-utils";

export async function getClassDetailsForGrading(classId: string, teacherId: string) {
    const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            students: {
                where: { isActive: true },
                orderBy: { lastName: 'asc' },
                include: {
                    grades: {
                        where: { teacherId: teacherId },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            }
        }
    });
    
    return classData;
}

export type StudentForGradeEntry = {
    id: string;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
    }
};

export async function getStudentsByClass(classId: string): Promise<StudentForGradeEntry[]> {
    const c = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            students: {
                where: { isActive: true },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true
                },
                orderBy: { lastName: 'asc' }
            }
        }
    });
    return (c?.students || []).map(s => ({
        id: s.id,
        user: { id: s.id, firstName: s.firstName, lastName: s.lastName }
    }));
}

export type EnrolledStudent = {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
};

export type DispensedStudent = {
    id: string;
    firstName: string;
    lastName: string;
    reason: string | null;
};

export type StudentsForGradingResult = {
    enrolledStudents: EnrolledStudent[];
    dispensedStudents: DispensedStudent[];
};

/**
 * Récupère les élèves d'une classe qui suivent une matière donnée.
 * Les élèves ayant une dispense pour cette matière sont isolés et exclus de la notation.
 */
export async function getStudentsForClassAndSubject(
    classId: string, 
    subjectId: string
): Promise<StudentsForGradingResult> {
    if (!classId || !subjectId) {
        return { enrolledStudents: [], dispensedStudents: [] };
    }

    const students = await prisma.user.findMany({
        where: {
            classId: classId,
            role: "STUDENT",
            isActive: true,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dispensations: {
                where: { subjectId: subjectId },
                select: {
                    id: true,
                    reason: true,
                }
            }
        },
        orderBy: [
            { lastName: "asc" },
            { firstName: "asc" }
        ]
    });

    const enrolledStudents: EnrolledStudent[] = [];
    const dispensedStudents: DispensedStudent[] = [];

    for (const s of students) {
        if (s.dispensations && s.dispensations.length > 0) {
            dispensedStudents.push({
                id: s.id,
                firstName: s.firstName || "",
                lastName: s.lastName || "",
                reason: s.dispensations[0]?.reason || null
            });
        } else {
            enrolledStudents.push({
                id: s.id,
                firstName: s.firstName || "",
                lastName: s.lastName || "",
                email: s.email
            });
        }
    }

    return {
        enrolledStudents,
        dispensedStudents
    };
}

/**
 * Récupère les matières enseignées pour une classe donnée par le professeur connecté.
 */
export async function getSubjectsForClass(classId: string): Promise<Array<{ id: string; name: string }>> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const teacherId = await getEffectiveTeacherId(session.user.id);

    // 1. Matières où le prof a des cours prévus avec cette classe
    const lessons = await prisma.lesson.findMany({
        where: {
            classId,
            teacherId,
            isFreeLesson: false,
            subjectId: { not: null },
        },
        select: {
            subject: {
                select: { id: true, name: true }
            }
        },
        distinct: ['subjectId']
    });

    let subjects = lessons
        .map(l => l.subject)
        .filter((s): s is { id: string; name: string } => Boolean(s));

    // 2. Si aucune leçon avec ce prof n'est encore planifiée pour cette classe,
    // récupérer les matières liées au prof ou requises par la classe
    if (subjects.length === 0) {
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            include: {
                subjects: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' }
                }
            }
        });
        if (teacher?.subjects && teacher.subjects.length > 0) {
            subjects = teacher.subjects;
        } else {
            // Repli sur toutes les matières de l'école
            subjects = await prisma.subject.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true }
            });
        }
    }

    return subjects;
}
