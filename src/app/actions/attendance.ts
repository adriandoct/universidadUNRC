"use server";

import { z } from 'zod';
import { createClient } from '../../utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Zod validation schemas
export const attendanceItemSchema = z.object({
  student_id: z.string().uuid('ID de estudiante inválido'),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional(),
});

export const bulkAttendanceSchema = z.object({
  course_id: z.string().uuid('ID de curso inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  records: z.array(attendanceItemSchema).min(1, 'Debe incluir al menos un registro de asistencia'),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

export async function recordBulkAttendance(input: BulkAttendanceInput) {
  try {
    // 1. Zod Validation
    const validated = bulkAttendanceSchema.parse(input);

    // 2. Initialize Supabase SSR Client
    const supabase = await createClient();

    // 3. Optional Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Build payload for upsert
    const payload = validated.records.map((r) => ({
      course_id: validated.course_id,
      student_id: r.student_id,
      date: validated.date,
      status: r.status,
      notes: r.notes || null,
    }));

    // 4. Perform transactional bulk upsert on attendances
    const { data, error } = await supabase
      .from('attendances')
      .upsert(payload, { onConflict: 'course_id,student_id,date' })
      .select();

    if (error) {
      console.error('Error upserting attendances:', error);
      return { success: false, error: `Error en la base de datos: ${error.message}` };
    }

    // 5. Revalidate cache
    revalidatePath('/teacher');
    revalidatePath('/admin');

    return {
      success: true,
      count: data ? data.length : payload.length,
      message: `Se registraron ${payload.length} asistencias correctamente.`,
    };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: `Error de validación: ${err.issues ? err.issues.map((e) => e.message).join(', ') : err.message}`,
      };
    }
    return {
      success: false,
      error: err.message || 'Error interno al registrar la asistencia.',
    };
  }
}
