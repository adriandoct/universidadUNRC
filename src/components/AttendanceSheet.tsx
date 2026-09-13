"use client";

import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, FileText, Search, Send, Sparkles, RefreshCw, Calendar } from 'lucide-react';
import { recordBulkAttendance } from '../app/actions/attendance';
import { db } from '@/lib/db';

export type AttendanceStatusType = 'present' | 'absent' | 'late' | 'excused';

export interface StudentItem {
  id: string;
  name: string;
  student_code: string;
  notes?: string;
}

interface AttendanceSheetProps {
  courseId: string;
  courseName: string;
  scheduleDescription?: string;
  students: StudentItem[];
  onAttendanceSubmitted?: () => void;
}

export default function AttendanceSheet({
  courseId,
  courseName,
  scheduleDescription = 'Lunes a Sábado',
  students,
  onAttendanceSubmitted,
}: AttendanceSheetProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: AttendanceStatusType; notes: string }>
  >(() => {
    const initial: Record<string, { status: AttendanceStatusType; notes: string }> = {};
    students.forEach((s) => {
      initial[s.id] = { status: 'present', notes: '' };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleStatusChange = (studentId: string, status: AttendanceStatusType) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  const handleMarkAll = (status: AttendanceStatusType) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const records = Object.entries(attendanceState).map(([student_id, data]) => ({
      student_id,
      status: data.status,
      notes: data.notes || undefined,
    }));

    try {
      // Sync locally in db
      const statusMap: Record<AttendanceStatusType, 'A' | 'R' | 'F' | 'J'> = {
        present: 'A',
        late: 'R',
        absent: 'F',
        excused: 'J'
      };
      await db.registrarAsistenciasLote(
        records.map(r => ({
          alumno_id: r.student_id,
          estado: statusMap[r.status] || 'A',
          fecha: selectedDate,
          curso_id: courseId,
          materia: courseName,
          observaciones: r.notes
        }))
      );

      const result = await recordBulkAttendance({
        course_id: courseId,
        date: selectedDate,
        records,
      });

      if (result.success) {
        setFeedback({
          type: 'success',
          message: `✅ Asistencia registrada y validada correctamente para el ${selectedDate}.`,
        });
        if (onAttendanceSubmitted) onAttendanceSubmitted();
      } else {
        setFeedback({
          type: 'error',
          message: `❌ ${result.error || 'No se pudo guardar la asistencia.'}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `❌ Error inesperado: ${err.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Módulo Docente • Tomador de Asistencia Diario</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">{courseName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            📍 <strong>Horario:</strong> {scheduleDescription}
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/10">
          <Calendar className="w-4 h-4 text-blue-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white text-xs font-bold focus:outline-none"
          />
        </div>
      </div>

      {/* Quick Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por estudiante o matrícula..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Bulk Preset Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleMarkAll('present')}
            className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Todos Presentes</span>
          </button>

          <button
            type="button"
            onClick={() => handleMarkAll('absent')}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Todos Ausentes</span>
          </button>
        </div>

      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Attendance Student Table */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Estudiante</th>
                <th className="p-3.5">Matrícula</th>
                <th className="p-3.5 text-center">Estado de Asistencia</th>
                <th className="p-3.5">Observación / Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/20">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500 italic">
                    No se encontraron estudiantes para este filtro.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const currentStatus = attendanceState[st.id]?.status || 'present';
                  const currentNotes = attendanceState[st.id]?.notes || '';

                  return (
                    <tr key={st.id} className="hover:bg-white/5 transition-colors">
                      
                      {/* Name */}
                      <td className="p-3.5 font-bold text-white">
                        {st.name}
                      </td>

                      {/* Code */}
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        {st.student_code}
                      </td>

                      {/* Single Click Status Buttons */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center p-1 rounded-xl bg-black/40 border border-white/10 space-x-1">
                          
                          {/* Presente */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'present')}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Presente</span>
                          </button>

                          {/* Tardanza */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'late')}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Tardanza</span>
                          </button>

                          {/* Ausente */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'absent')}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Ausente</span>
                          </button>

                          {/* Justificado */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'excused')}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                              currentStatus === 'excused'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Justificado</span>
                          </button>

                        </div>
                      </td>

                      {/* Notes Input */}
                      <td className="p-3.5">
                        <input
                          type="text"
                          value={currentNotes}
                          onChange={(e) => handleNotesChange(st.id, e.target.value)}
                          placeholder="Nota u observación..."
                          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Total de estudiantes en lista: <strong className="text-white">{students.length}</strong>
          </p>

          <button
            type="submit"
            disabled={isSubmitting || students.length === 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando Asistencia...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Guardar Asistencia de Clase</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
