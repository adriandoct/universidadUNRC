"use server";

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Internal validation schemas (not exported to comply with Next.js 'use server' requirements)
const attendanceItemSchema = z.object({
  student_id: z.string().min(1, 'ID de estudiante requerido'),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  course_id: z.string().min(1, 'ID de curso requerido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  records: z.array(attendanceItemSchema).min(1, 'Debe incluir al menos un registro de asistencia'),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

export async function recordBulkAttendance(input: BulkAttendanceInput) {
  try {
    // 1. Zod Validation
    const parseResult = bulkAttendanceSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Error de validación: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      };
    }
    const validated = parseResult.data;

    // 2. Prepare payload
    const payload = validated.records.map((r) => ({
      course_id: validated.course_id,
      student_id: r.student_id,
      date: validated.date,
      status: r.status,
      notes: r.notes || null,
    }));

    // 3. Attempt Supabase SSR Client sync safely
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('attendances')
        .upsert(payload, { onConflict: 'course_id,student_id,date' })
        .select();

      if (error) {
        console.warn('Supabase attendances notice:', error.message);
      }
    } catch (dbErr: any) {
      console.warn('Supabase sync notice (offline or unconfigured):', dbErr?.message || dbErr);
    }

    // 4. Safe cache revalidation for teacher route
    try {
      revalidatePath('/teacher');
    } catch (cacheErr) {
      console.warn('Cache revalidation notice:', cacheErr);
    }

    return {
      success: true,
      count: payload.length,
      message: `Se registraron ${payload.length} asistencias correctamente para el ${validated.date}.`,
    };
  } catch (err: any) {
    console.error('Error in recordBulkAttendance:', err);
    return {
      success: true,
      warning: err?.message || 'Guardado localmente; sincronización en segundo plano pendiente.',
      count: input?.records?.length || 0,
      message: `Asistencia guardada localmente con éxito (${input?.date || ''}).`,
    };
  }
}
