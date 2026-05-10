"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setDispensation(studentId: string, subjectId: string, isDispensed: boolean, reason?: string) {
    if (isDispensed) {
        await prisma.dispensation.create({
            data: { studentId, subjectId, reason }
        });
    } else {
        await prisma.dispensation.deleteMany({
            where: { studentId, subjectId }
        });
    }
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true };
}
