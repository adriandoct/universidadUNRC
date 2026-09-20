"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Search,
  Send,
  Sparkles,
  RefreshCw,
  Calendar,
  Star,
  Award,
  Plus,
  Trash2,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  UserCheck,
  Zap,
  Info
} from 'lucide-react';
import { db, Participacion, Asistencia } from '@/lib/db';
import { getTijuanaDateString } from '@/lib/tijuanaTime';
import * as XLSX from 'xlsx';

export type AttendanceStatusType = 'present' | 'absent' | 'late' | 'excused';
export type ParticipationType = 'AP' | 'RP' | 'REGULAR' | 'NINGUNA';

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
  // Current active view tab
  const [activeTab, setActiveTab] = useState<'sheet' | 'board'>('sheet');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTijuanaDateString());
  const [searchQuery, setSearchQuery] = useState('');

  // Daily student states for attendance & participation
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: AttendanceStatusType; participation: ParticipationType; notes: string }>
  >(() => {
    const initial: Record<string, { status: AttendanceStatusType; participation: ParticipationType; notes: string }> = {};
    students.forEach((s) => {
      initial[s.id] = { status: 'present', participation: 'NINGUNA', notes: '' };
    });
    return initial;
  });

  // Global historical participations for this course
  const [allParticipaciones, setAllParticipaciones] = useState<Participacion[]>([]);
  const [filterBoardDate, setFilterBoardDate] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Quick Live Participation Modal State
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickStudentId, setQuickStudentId] = useState<string>('');
  const [quickType, setQuickType] = useState<'AP' | 'RP' | 'REGULAR'>('AP');
  const [quickNote, setQuickNote] = useState('');

  // Load existing attendances and participations whenever courseId or selectedDate changes
  const reloadData = async () => {
    try {
      const [asistenciasList, participacionesList] = await Promise.all([
        db.getAsistencias(),
        db.getParticipaciones(),
      ]);

      // Filter participations relevant to this course
      const courseParticipaciones = participacionesList.filter(
        (p) => p.curso_id === courseId || p.grupo_id === courseId || !p.curso_id
      );
      setAllParticipaciones(courseParticipaciones);

      // Pre-populate sheet if records already exist for selectedDate
      const dateAsistencias = asistenciasList.filter(
        (a) => a.fecha === selectedDate && (a.grupo_id === courseId || (a as any).curso_id === courseId)
      );
      const dateParticipaciones = courseParticipaciones.filter(
        (p) => p.fecha === selectedDate
      );

      const statusReverseMap: Record<string, AttendanceStatusType> = {
        A: 'present',
        R: 'late',
        F: 'absent',
        J: 'excused',
      };

      const nextState: Record<string, { status: AttendanceStatusType; participation: ParticipationType; notes: string }> = {};

      students.forEach((st) => {
        const existingAtt = dateAsistencias.find(
          (a) => a.alumno_id === st.id || a.alumno?.matricula === st.student_code || a.alumno_id === st.student_code
        );
        const existingPart = dateParticipaciones.find(
          (p) => p.alumno_id === st.id || p.alumno?.matricula === st.student_code || p.alumno_id === st.student_code
        );

        nextState[st.id] = {
          status: existingAtt ? statusReverseMap[existingAtt.estado] || 'present' : 'present',
          participation: existingPart ? existingPart.tipo : 'NINGUNA',
          notes: existingAtt?.observaciones || existingPart?.observaciones || '',
        };
      });

      setAttendanceState(nextState);
    } catch (err) {
      console.warn('Notice loading attendances/participaciones:', err);
    }
  };

  useEffect(() => {
    reloadData();
  }, [courseId, selectedDate, students]);

  // Handlers for sheet row updates
  const handleStatusChange = (studentId: string, status: AttendanceStatusType) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleParticipationChange = (studentId: string, participation: ParticipationType) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], participation },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  const handleMarkAllStatus = (status: AttendanceStatusType) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  };

  const handleMarkAllParticipation = (participation: ParticipationType) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], participation };
      });
      return updated;
    });
  };

  // Submit Daily Attendance + Daily Participations safely to db
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const statusMap: Record<AttendanceStatusType, 'A' | 'R' | 'F' | 'J'> = {
        present: 'A',
        late: 'R',
        absent: 'F',
        excused: 'J',
      };

      const attendanceRecords = Object.entries(attendanceState).map(([student_id, data]) => ({
        alumno_id: student_id,
        estado: statusMap[data.status] || 'A',
        fecha: selectedDate,
        curso_id: courseId,
        materia: courseName,
        observaciones: data.notes || undefined,
      }));

      const participationRecords = Object.entries(attendanceState).map(([student_id, data]) => ({
        alumno_id: student_id,
        tipo: data.participation,
        fecha: selectedDate,
        curso_id: courseId,
        materia: courseName,
        observaciones: data.notes || undefined,
      }));

      // 1. Save Attendance in batch
      await db.registrarAsistenciasLote(attendanceRecords);

      // 2. Save Participations in batch
      const partsCount = await db.registrarParticipacionesLote(participationRecords);

      // 3. Reload historical data
      await reloadData();

      // Feedback message
      const partsMessage = partsCount > 0 ? ` y ${partsCount} participaciones evaluadas` : '';
      setFeedback({
        type: 'success',
        message: `✅ Asistencia de ${students.length} alumnos${partsMessage} guardada exitosamente para el día ${selectedDate}.`,
      });

      if (onAttendanceSubmitted) onAttendanceSubmitted();
    } catch (err: any) {
      console.error('Error saving attendance/participaciones:', err);
      setFeedback({
        type: 'error',
        message: `❌ Error al guardar registros: ${err?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit single live participation from modal
  const handleQuickParticipationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStudentId) return;

    try {
      await db.registrarParticipacion(
        quickStudentId,
        quickType,
        quickNote.trim() || undefined,
        selectedDate,
        courseId,
        courseName
      );

      // Sync local sheet state as well
      setAttendanceState((prev) => ({
        ...prev,
        [quickStudentId]: {
          ...(prev[quickStudentId] || { status: 'present', notes: '' }),
          participation: quickType,
          notes: quickNote || prev[quickStudentId]?.notes || '',
        },
      }));

      await reloadData();
      setIsQuickModalOpen(false);
      setQuickNote('');
      setFeedback({
        type: 'success',
        message: `⭐ Participación registrada exitosamente para el día ${selectedDate}.`,
      });
    } catch (err: any) {
      alert(`Error al registrar participación: ${err?.message || err}`);
    }
  };

  // Delete participation record
  const handleDeleteParticipation = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de participación?')) return;
    try {
      await db.eliminarParticipacion(id);
      await reloadData();
      setFeedback({
        type: 'info',
        message: '🗑️ Registro de participación eliminado.',
      });
    } catch (err: any) {
      alert(`Error: ${err?.message || err}`);
    }
  };

  // Export Daily Participations to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredBoardParticipaciones.map((p) => ({
        Fecha: p.fecha,
        Alumno: p.alumno ? `${p.alumno.nombre} ${p.alumno.apellido_paterno}` : p.alumno_id,
        Matrícula: p.alumno?.matricula || p.alumno_id,
        Curso: courseName,
        'Tipo de Participación':
          p.tipo === 'AP' ? 'Aprobada / Excelente (10 pts)' : p.tipo === 'RP' ? 'Por Mejorar (5 pts)' : 'Regular (7.5 pts)',
        Puntos: p.puntos,
        Observaciones: p.observaciones || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participaciones');
      XLSX.writeFile(wb, `Participaciones_${courseName.slice(0, 20)}_${selectedDate}.xlsx`);
    } catch (err) {
      console.error('Error exportando a Excel:', err);
    }
  };

  // Filtered lists
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBoardParticipaciones = useMemo(() => {
    if (filterBoardDate === 'all') return allParticipaciones;
    return allParticipaciones.filter((p) => p.fecha === filterBoardDate);
  }, [allParticipaciones, filterBoardDate]);

  // Ranking of top students with participations in this course
  const studentRankings = useMemo(() => {
    const stats: Record<string, { student: StudentItem; totalPoints: number; count: number }> = {};

    students.forEach((st) => {
      stats[st.id] = { student: st, totalPoints: 0, count: 0 };
    });

    allParticipaciones.forEach((p) => {
      const targetId = Object.keys(stats).find(
        (id) => id === p.alumno_id || stats[id].student.student_code === p.alumno_id
      );
      if (targetId && stats[targetId]) {
        stats[targetId].totalPoints += p.puntos;
        stats[targetId].count += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [students, allParticipaciones]);

  // Available unique dates for filter dropdown
  const uniqueDates = useMemo(() => {
    const dates = new Set(allParticipaciones.map((p) => p.fecha));
    dates.add(selectedDate);
    return Array.from(dates).sort().reverse();
  }, [allParticipaciones, selectedDate]);

  // Counts for current day
  const dailyPresentCount = Object.values(attendanceState).filter((s) => s.status === 'present').length;
  const dailyAbsentCount = Object.values(attendanceState).filter((s) => s.status === 'absent').length;
  const dailyParticipatingCount = Object.values(attendanceState).filter((s) => s.participation !== 'NINGUNA').length;

  return (
    <div className="bg-[#0B132B]/90 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      
      {/* Top Header & Course Details */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Módulo Docente Oficial • Control de Asistencia & Participaciones UNRC</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{courseName}</h2>
          <p className="text-xs text-gray-400 flex items-center space-x-2">
            <span>📍 <strong>Horario:</strong> {scheduleDescription}</span>
          </p>
        </div>

        {/* Date Selector con Zona Horaria Tijuana */}
        <div className="flex items-center space-x-3 bg-black/60 px-4 py-2 rounded-2xl border border-blue-500/30 shadow-inner">
          <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold text-blue-300 uppercase tracking-wider">
              Fecha de Sesión (Tijuana)
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Asistencia vs Tablero de Participaciones) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-2">
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'sheet'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>📋 Toma Diaria (Asistencia + Participación)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'board'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>⭐ Tablero de Participaciones por Día</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-mono text-amber-200">
              {allParticipaciones.length}
            </span>
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{dailyPresentCount} Presentes</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>{dailyAbsentCount} Ausentes</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{dailyParticipatingCount} Participando Hoy</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold border flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : feedback.type === 'error'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TOMA DIARIA (ASISTENCIA + PARTICIPACIÓN POR ALUMNO)                 */}
      {/* ========================================================================= */}
      {activeTab === 'sheet' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Controls Bar: Search & Bulk Presets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por estudiante o matrícula en este curso..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Bulk Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAllStatus('present')}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                title="Marcar a todos como presentes en la fecha actual"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Todos Presentes</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAllStatus('absent')}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                title="Marcar a todos como ausentes en la fecha actual"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Todos Ausentes</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAllParticipation('NINGUNA')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition-all flex items-center space-x-1.5"
                title="Limpiar participaciones de la fecha actual"
              >
                <span>Limpiar Participaciones</span>
              </button>
            </div>
          </div>

          {/* Form with Attendance + Daily Participation Table */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/80 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Estudiante / Matrícula</th>
                    <th className="p-3.5 text-center">Asistencia del Día</th>
                    <th className="p-3.5 text-center">
                      <span className="flex items-center justify-center space-x-1 text-amber-300">
                        <Star className="w-3 h-3 fill-amber-300" />
                        <span>Participación ({selectedDate})</span>
                      </span>
                    </th>
                    <th className="p-3.5">Observación / Nota</th>
                    <th className="p-3.5 text-center">Ptos. Acumulados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/30">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                        No se encontraron estudiantes para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const currentStatus = attendanceState[st.id]?.status || 'present';
                      const currentPart = attendanceState[st.id]?.participation || 'NINGUNA';
                      const currentNotes = attendanceState[st.id]?.notes || '';

                      // Total participations for this student in this course
                      const studentParts = allParticipaciones.filter(
                        (p) => p.alumno_id === st.id || p.alumno?.matricula === st.student_code
                      );
                      const totalPuntos = studentParts.reduce((acc, curr) => acc + curr.puntos, 0);

                      return (
                        <tr key={st.id} className="hover:bg-white/5 transition-colors">
                          
                          {/* Student Info */}
                          <td className="p-3.5">
                            <div className="font-bold text-white leading-snug">{st.name}</div>
                            <div className="font-mono text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center space-x-2">
                              <span>{st.student_code}</span>
                              {st.notes && <span className="text-gray-500">• {st.notes}</span>}
                            </div>
                          </td>

                          {/* Attendance Status Buttons */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center p-1 rounded-xl bg-black/50 border border-white/10 space-x-1">
                              {/* Presente */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'present')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Presente (A)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Presente</span>
                              </button>

                              {/* Tardanza */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'late')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'late'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Tardanza (R)"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Tardanza</span>
                              </button>

                              {/* Ausente */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'absent')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Ausente (F)"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Ausente</span>
                              </button>

                              {/* Justificado */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'excused')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'excused'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Justificado (J)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Justif.</span>
                              </button>
                            </div>
                          </td>

                          {/* Daily Participation Selector Buttons */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center p-1 rounded-xl bg-black/50 border border-white/10 space-x-1">
                              {/* AP: Aprobada/Excelente (+10) */}
                              <button
                                type="button"
                                onClick={() => handleParticipationChange(st.id, currentPart === 'AP' ? 'NINGUNA' : 'AP')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center space-x-1 ${
                                  currentPart === 'AP'
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30 font-black'
                                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                                }`}
                                title="Participación Excelente: Aporte destacado (10 pts)"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Excelente (+10)</span>
                              </button>

                              {/* REGULAR: Buena/Estándar (+7.5) */}
                              <button
                                type="button"
                                onClick={() => handleParticipationChange(st.id, currentPart === 'REGULAR' ? 'NINGUNA' : 'REGULAR')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentPart === 'REGULAR'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-blue-400/80 hover:text-blue-300 hover:bg-blue-500/10'
                                }`}
                                title="Participación Regular: Buena intervención (7.5 pts)"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Buena (+7.5)</span>
                              </button>

                              {/* RP: Requerido/Por Mejorar (+5) */}
                              <button
                                type="button"
                                onClick={() => handleParticipationChange(st.id, currentPart === 'RP' ? 'NINGUNA' : 'RP')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentPart === 'RP'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'text-orange-400/80 hover:text-orange-300 hover:bg-orange-500/10'
                                }`}
                                title="Participación Mínima: Intervención por mejorar (5 pts)"
                              >
                                <span>Mínima (+5)</span>
                              </button>

                              {/* Ninguna */}
                              {currentPart !== 'NINGUNA' && (
                                <button
                                  type="button"
                                  onClick={() => handleParticipationChange(st.id, 'NINGUNA')}
                                  className="px-1.5 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-white"
                                  title="Quitar participación de hoy"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="p-3.5">
                            <input
                              type="text"
                              value={currentNotes}
                              onChange={(e) => handleNotesChange(st.id, e.target.value)}
                              placeholder="Observación de asistencia o aportación..."
                              className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* Historical Total Points */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-amber-300">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{totalPuntos} pts</span>
                              <span className="text-gray-500 font-normal text-[10px]">({studentParts.length})</span>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Submit Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-gray-400">
                Total estudiantes: <strong className="text-white">{students.length}</strong> • 
                Presentes: <strong className="text-emerald-400">{dailyPresentCount}</strong> • 
                Participando hoy: <strong className="text-amber-400">{dailyParticipatingCount}</strong>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || students.length === 0}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando Asistencia & Participaciones...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Guardar Asistencia y Participaciones del Día</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TABLERO & BITÁCORA DE PARTICIPACIONES DIARIAS                      */}
      {/* ========================================================================= */}
      {activeTab === 'board' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top Board Metrics & Live Add Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Aportaciones</span>
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {allParticipaciones.length}
              </div>
              <p className="text-[11px] text-gray-400">Registradas en el curso</p>
            </div>

            {/* Metric 2 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 space-y-1">
              <div className="flex items-center justify-between text-blue-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Puntos Promedio</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {allParticipaciones.length > 0
                  ? (allParticipaciones.reduce((a, c) => a + c.puntos, 0) / allParticipaciones.length).toFixed(1)
                  : '10.0'}{' '}
                <span className="text-sm font-normal text-gray-400">/ 10</span>
              </div>
              <p className="text-[11px] text-gray-400">Ponderación oficial: 20%</p>
            </div>

            {/* Metric 3 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Alumnos con Aportes</span>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {new Set(allParticipaciones.map((p) => p.alumno_id)).size}{' '}
                <span className="text-sm font-normal text-gray-400">de {students.length}</span>
              </div>
              <p className="text-[11px] text-gray-400">
                {students.length > 0
                  ? `${Math.round((new Set(allParticipaciones.map((p) => p.alumno_id)).size / students.length) * 100)}% de participación`
                  : '0%'}
              </p>
            </div>

            {/* Quick Live Add Button */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-xs font-bold text-amber-300 block">⭐ Registro Rápido en Vivo</span>
                <span className="text-[11px] text-gray-300 block">Premiar intervención en plena clase</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickStudentId(students[0]?.id || '');
                  setIsQuickModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Participación</span>
              </button>
            </div>

          </div>

          {/* Ranking / Podio de Participaciones */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Ranking de Participación del Grupo</h3>
              </div>
              <span className="text-[11px] text-gray-400">Evaluación continua para el 20% de calificación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {studentRankings.slice(0, 3).map((rk, idx) => (
                <div
                  key={rk.student.id}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-400/10 border-slate-400/30 text-slate-200'
                      : 'bg-amber-800/10 border-amber-800/30 text-amber-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-black'
                        : idx === 1
                        ? 'bg-slate-300 text-black'
                        : 'bg-amber-700 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-bold text-xs text-white block truncate">{rk.student.name}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">{rk.student.student_code}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm text-amber-300 block">{rk.totalPoints} pts</span>
                    <span className="text-[10px] text-gray-400 block">{rk.count} interv.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Board Daily Filter & Export Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-400" />
              <label className="text-xs font-bold text-gray-300">Filtrar por Día:</label>
              <select
                value={filterBoardDate}
                onChange={(e) => setFilterBoardDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-blue-500/30 text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">📅 Todo el Historial del Curso ({allParticipaciones.length})</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    Día: {d} {d === selectedDate ? '(Seleccionado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredBoardParticipaciones.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar a Excel (.xlsx)</span>
              </button>
            </div>

          </div>

          {/* Participations Historical Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-black/80 text-gray-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Estudiante</th>
                  <th className="p-3.5">Matrícula</th>
                  <th className="p-3.5 text-center">Nivel / Puntos</th>
                  <th className="p-3.5">Observaciones de la Intervención</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-black/30">
                {filteredBoardParticipaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                      No hay participaciones registradas para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredBoardParticipaciones.map((p) => {
                    const studentMatch = students.find(
                      (s) => s.id === p.alumno_id || s.student_code === p.alumno_id
                    );
                    const studentName = p.alumno
                      ? `${p.alumno.nombre} ${p.alumno.apellido_paterno}`
                      : studentMatch?.name || p.alumno_id;
                    const studentCode = p.alumno?.matricula || studentMatch?.student_code || '-';

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        
                        {/* Fecha */}
                        <td className="p-3.5 font-mono text-blue-300 font-bold">
                          {p.fecha}
                        </td>

                        {/* Estudiante */}
                        <td className="p-3.5 font-bold text-white">
                          {studentName}
                        </td>

                        {/* Matrícula */}
                        <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                          {studentCode}
                        </td>

                        {/* Nivel / Puntos */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                              p.tipo === 'AP'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : p.tipo === 'REGULAR'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                            }`}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>
                              {p.tipo === 'AP'
                                ? 'Excelente (+10)'
                                : p.tipo === 'REGULAR'
                                ? 'Buena (+7.5)'
                                : 'Mínima (+5)'}
                            </span>
                          </span>
                        </td>

                        {/* Observaciones */}
                        <td className="p-3.5 text-gray-300 text-xs italic">
                          {p.observaciones || 'Participación en clase'}
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteParticipation(p.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Eliminar esta participación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MODAL: REGISTRAR PARTICIPACIÓN EN VIVO                              */}
      {/* ========================================================================= */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D1527] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-white">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Registrar Participación en Vivo</h3>
                  <p className="text-xs text-gray-400">Fecha de asignación: {selectedDate}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickParticipationSubmit} className="space-y-4">
              {/* Select Student */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Seleccionar Alumno:</label>
                <select
                  value={quickStudentId}
                  onChange={(e) => setQuickStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.student_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Nivel de Aportación:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickType('AP')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      quickType === 'AP'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-md font-bold'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-4 h-4 mx-auto mb-1 fill-current" />
                    <span className="text-xs block">Excelente</span>
                    <span className="text-[10px] text-amber-400 font-mono">+10 pts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickType('REGULAR')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      quickType === 'REGULAR'
                        ? 'bg-blue-500/25 border-blue-400 text-blue-300 shadow-md font-bold'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">Buena</span>
                    <span className="text-[10px] text-blue-400 font-mono">+7.5 pts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickType('RP')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      quickType === 'RP'
                        ? 'bg-orange-500/25 border-orange-400 text-orange-300 shadow-md font-bold'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">Por Mejorar</span>
                    <span className="text-[10px] text-orange-400 font-mono">+5 pts</span>
                  </button>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Observación / Detalle:</label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Ej: Resolvió ejercicio en pizarrón, aportó al debate..."
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-black" />
                  <span>Guardar Participación</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
