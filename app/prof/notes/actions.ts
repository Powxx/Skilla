"use server";

import prisma from "@/lib/prisma";

export async function getClassDetailsForGrading(classId: string, teacherId: string) {
    const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            students: {
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
