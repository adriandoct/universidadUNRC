"use client";

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Star,
  Download,
  UploadCloud,
  Edit3,
  Search,
  Users,
  Award,
  Filter,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import type { Asistencia, Participacion } from '@/lib/db';
import type { StudentItem } from './AttendanceSheet';
import { formatDateColumnLabel } from '@/lib/googleSheetsSync';
import * as XLSX from 'xlsx';

interface AttendanceCalendarHistoryProps {
  courseId: string;
  courseName: string;
  courseMateria?: string;
  courseGrupo?: string;
  students: StudentItem[];
  allAsistencias: Asistencia[];
  allParticipaciones: Participacion[];
  classDates: string[];
  currentDate?: string;
  onSelectDateForEditing?: (dateStr: string) => void;
  onUpdateGoogleSheetForDate?: (dateStr: string) => void;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AttendanceCalendarHistory({
  courseId,
  courseName,
  courseMateria,
  courseGrupo,
  students,
  allAsistencias,
  allParticipaciones,
  classDates = [],
  currentDate,
  onSelectDateForEditing,
  onUpdateGoogleSheetForDate,
}: AttendanceCalendarHistoryProps) {
  // Inicializar mes/año basado en la fecha actual seleccionada o la fecha del sistema (2026-10-17)
  const initialDate = useMemo(() => {
    if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
      const [y, m, d] = currentDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [currentDate]);

  const [currentYear, setCurrentYear] = useState<number>(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => initialDate.getMonth()); // 0-11
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) return currentDate;
    // Si hay fechas de clase oficiales, seleccionar la última o más reciente
    if (classDates.length > 0) return classDates[classDates.length - 1];
    return new Date().toISOString().slice(0, 10);
  });

  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'excused'>('all');

  // Navegación de meses
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDayStr(todayStr);
  };

  // Conjunto de fechas oficiales para búsqueda O(1)
  const classDatesSet = useMemo(() => new Set(classDates), [classDates]);

  // Agrupador de asistencias por fecha YYYY-MM-DD
  const asistenciasByDate = useMemo(() => {
    const map = new Map<string, Asistencia[]>();
    allAsistencias.forEach((a) => {
      const list = map.get(a.fecha) || [];
      list.push(a);
      map.set(a.fecha, list);
    });
    return map;
  }, [allAsistencias]);

  // Agrupador de participaciones por fecha YYYY-MM-DD
  const participacionesByDate = useMemo(() => {
    const map = new Map<string, Participacion[]>();
    allParticipaciones.forEach((p) => {
      const list = map.get(p.fecha) || [];
      list.push(p);
      map.set(p.fecha, list);
    });
    return map;
  }, [allParticipaciones]);

  // Generar cuadrícula del mes actual (calendario de lunes a domingo)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // En JS: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado.
    // Convertir a Lunes = 0, ..., Domingo = 6:
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Días del mes anterior para relleno inicial
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const cells: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isOfficialClassDate: boolean;
      hasRecords: boolean;
      stats: {
        presentes: number;
        retardos: number;
        faltas: number;
        justificados: number;
        participaciones: number;
        puntos: number;
      };
    }> = [];

    // Celdas previas
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isOfficialClassDate: classDatesSet.has(dStr),
        hasRecords: asistenciasByDate.has(dStr) || participacionesByDate.has(dStr),
        stats: { presentes: 0, retardos: 0, faltas: 0, justificados: 0, participaciones: 0, puntos: 0 },
      });
    }

    // Celdas del mes actual
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayAsist = asistenciasByDate.get(dStr) || [];
      const dayParts = participacionesByDate.get(dStr) || [];

      let pres = 0;
      let ret = 0;
      let fal = 0;
      let just = 0;
      dayAsist.forEach((a) => {
        if (a.estado === 'A') pres++;
        else if (a.estado === 'R') ret++;
        else if (a.estado === 'J') just++;
        else fal++;
      });

      const dayPoints = dayParts.reduce((acc, p) => acc + (p.puntos || 0), 0);

      cells.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: true,
        isOfficialClassDate: classDatesSet.has(dStr),
        hasRecords: dayAsist.length > 0 || dayParts.length > 0,
        stats: {
          presentes: pres,
          retardos: ret,
          faltas: fal,
          justificados: just,
          participaciones: dayParts.length,
          puntos: dayPoints,
        },
      });
    }

    // Celdas posteriores para completar filas de 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: false,
        isOfficialClassDate: classDatesSet.has(dStr),
        hasRecords: asistenciasByDate.has(dStr) || participacionesByDate.has(dStr),
        stats: { presentes: 0, retardos: 0, faltas: 0, justificados: 0, participaciones: 0, puntos: 0 },
      });
    }

    return cells;
  }, [currentYear, currentMonth, classDatesSet, asistenciasByDate, participacionesByDate]);

  // Resumen del mes actual
  const monthSummary = useMemo(() => {
    let classesInMonth = 0;
    let evaluatedDays = 0;
    let totalPresentes = 0;
    let totalRetardos = 0;
    let totalFaltas = 0;
    let totalParticipaciones = 0;
    let totalPuntos = 0;

    calendarCells.forEach((c) => {
      if (c.isCurrentMonth) {
        if (c.isOfficialClassDate) classesInMonth++;
        if (c.hasRecords) {
          evaluatedDays++;
          totalPresentes += c.stats.presentes;
          totalRetardos += c.stats.retardos;
          totalFaltas += c.stats.faltas;
          totalParticipaciones += c.stats.participaciones;
          totalPuntos += c.stats.puntos;
        }
      }
    });

    const totalStudentsRegistered = students.length || 1;
    const totalPotentialAttendances = evaluatedDays * totalStudentsRegistered || 1;
    const effectiveAttendances = totalPresentes + totalRetardos * 0.8;
    const attendancePct = Math.min(100, Math.round((effectiveAttendances / totalPotentialAttendances) * 100));

    return {
      classesInMonth,
      evaluatedDays,
      totalPresentes,
      totalRetardos,
      totalFaltas,
      totalParticipaciones,
      totalPuntos,
      attendancePct: isNaN(attendancePct) ? 0 : attendancePct,
    };
  }, [calendarCells, students.length]);

  // Detalle del día seleccionado
  const selectedDayData = useMemo(() => {
    if (!selectedDayStr) return null;

    const dayAsist = asistenciasByDate.get(selectedDayStr) || [];
    const dayParts = participacionesByDate.get(selectedDayStr) || [];

    // Mapeo por estudiante
    const studentRows = students.map((st, idx) => {
      const matchAtt = dayAsist.find(
        (a) =>
          a.alumno_id === st.id ||
          a.alumno_id === st.student_code ||
          a.alumno?.matricula === st.student_code
      );
      const matchParts = dayParts.filter(
        (p) =>
          p.alumno_id === st.id ||
          p.alumno_id === st.student_code ||
          p.alumno?.matricula === st.student_code
      );

      const status: 'present' | 'late' | 'absent' | 'excused' =
        matchAtt?.estado === 'A'
          ? 'present'
          : matchAtt?.estado === 'R'
          ? 'late'
          : matchAtt?.estado === 'J'
          ? 'excused'
          : matchAtt?.estado === 'F'
          ? 'absent'
          : 'present';

      const partType: 'AP' | 'RP' | 'REGULAR' | 'NINGUNA' =
        matchParts.length > 0 ? (matchParts[0].tipo as any) : 'NINGUNA';

      const points = matchParts.reduce((sum, p) => sum + (p.puntos || 0), 0);
      const observations =
        matchParts.map((p) => p.observaciones).filter(Boolean).join('; ') ||
        matchAtt?.observaciones ||
        '';

      return {
        num: idx + 1,
        id: st.id,
        matricula: st.student_code,
        name: st.name,
        date: selectedDayStr,
        status,
        statusRaw: matchAtt?.estado || (status === 'present' ? 'A' : 'F'),
        partType,
        hasDoublePart: matchParts.length >= 2,
        points,
        observations,
      };
    });

    const totalStudents = studentRows.length;
    const presCount = studentRows.filter((r) => r.status === 'present').length;
    const retCount = studentRows.filter((r) => r.status === 'late').length;
    const falCount = studentRows.filter((r) => r.status === 'absent').length;
    const justCount = studentRows.filter((r) => r.status === 'excused').length;
    const totalParts = dayParts.length;
    const totalPts = studentRows.reduce((acc, r) => acc + r.points, 0);

    const effective = presCount + retCount * 0.8 + justCount;
    const pct = totalStudents > 0 ? Math.min(100, Math.round((effective / totalStudents) * 100)) : 0;

    return {
      date: selectedDayStr,
      isOfficialClass: classDatesSet.has(selectedDayStr),
      studentRows,
      stats: {
        totalStudents,
        presCount,
        retCount,
        falCount,
        justCount,
        totalParts,
        totalPts,
        pct,
      },
    };
  }, [selectedDayStr, asistenciasByDate, participacionesByDate, students, classDatesSet]);

  // Filtrado de alumnos en la tabla del día
  const filteredStudentsOfDay = useMemo(() => {
    if (!selectedDayData) return [];
    return selectedDayData.studentRows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        row.matricula.toLowerCase().includes(tableSearchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [selectedDayData, tableSearchQuery, statusFilter]);

  // Exportar el día seleccionado a Excel (.xlsx)
  const handleExportDayExcel = () => {
    if (!selectedDayData) return;
    try {
      const dataToExport = selectedDayData.studentRows.map((r) => ({
        No: r.num,
        Matrícula: r.matricula,
        'Nombre del Alumno': r.name,
        'Día / Fecha': r.date,
        'Estado Asistencia':
          r.status === 'present'
            ? 'Presente (A)'
            : r.status === 'late'
            ? 'Retardo (R)'
            : r.status === 'excused'
            ? 'Justificado (J)'
            : 'Falta (F)',
        'Símbolo UNRC': r.statusRaw,
        'Nivel de Participación':
          r.partType === 'AP'
            ? 'Excelente (+10 pts)'
            : r.partType === 'REGULAR'
            ? 'Buena (+7.5 pts)'
            : r.partType === 'RP'
            ? 'Mínima (+5 pts)'
            : 'Ninguna',
        'Puntos de Participación': r.points,
        Observaciones: r.observations || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Asistencia_${selectedDayStr}`);
      XLSX.writeFile(
        wb,
        `UNRC_Asistencia_${courseGrupo || 'Grupo'}_${selectedDayStr}.xlsx`
      );
    } catch (err) {
      console.error('Error exportando día a Excel:', err);
    }
  };

  // Formato legible de fecha en español
  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. HEADER DE NAVEGACIÓN Y RESUMEN DEL CALENDARIO                          */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0C1527] via-[#091D30] to-[#082822] border border-cyan-500/30 shadow-2xl space-y-4">
        
        {/* Fila Superior: Controles de Mes y Selector de Grupo */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-inner">
              <CalendarIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Historial de Asistencias & Participaciones en Calendario
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase">
                  UNRC 2026-2
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Visualiza día por día el avance de asistencias, faltas, retardos y participaciones acumuladas.
              </p>
            </div>
          </div>

          {/* Navegación Mes / Año */}
          <div className="flex items-center space-x-2 self-stretch md:self-auto justify-between md:justify-end">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/15 text-white hover:text-cyan-400 transition-all cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-4 py-2 rounded-xl bg-black/70 border border-cyan-500/30 text-white font-black text-sm text-center min-w-[170px] shadow-inner">
              <span className="text-cyan-300 capitalize">{MONTH_NAMES_ES[currentMonth]}</span>{' '}
              <span className="text-gray-300 font-mono">{currentYear}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/15 text-white hover:text-cyan-400 transition-all cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all cursor-pointer"
              title="Ir al día de hoy"
            >
              Hoy
            </button>
          </div>

        </div>

        {/* Fila Inferior: 4 Tarjetas KPI del Mes Actual */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
          
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-gray-400 uppercase font-bold block truncate">Clases en el Mes</span>
              <span className="text-base font-black text-white">{monthSummary.classesInMonth} sesiones</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-emerald-300/80 uppercase font-bold block truncate">% Asistencia Mes</span>
              <span className="text-base font-black text-emerald-300">{monthSummary.attendancePct}%</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-amber-300/80 uppercase font-bold block truncate">Participaciones</span>
              <span className="text-base font-black text-amber-300">{monthSummary.totalParticipaciones} ({monthSummary.totalPuntos} pts)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-rose-300/80 uppercase font-bold block truncate">Inasistencias</span>
              <span className="text-base font-black text-rose-300">{monthSummary.totalFaltas} faltas</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. CUADRÍCULA MENSUAL INTERACTIVA                                         */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-black/50 border border-white/10 shadow-xl space-y-3">
        
        {/* Encabezados de Días de la Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-black text-gray-400 uppercase py-1 border-b border-white/10">
          {WEEKDAY_NAMES_ES.map((dName, idx) => (
            <div key={dName} className={idx >= 5 ? 'text-amber-400/80' : ''}>
              {dName}
            </div>
          ))}
        </div>

        {/* Celdas de los Días */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            const isSelected = selectedDayStr === cell.dateStr;
            const isToday =
              cell.dateStr ===
              `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
                new Date().getDate()
              ).padStart(2, '0')}`;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => setSelectedDayStr(cell.dateStr)}
                className={`relative min-h-[72px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-2xl text-left transition-all flex flex-col justify-between cursor-pointer border ${
                  !cell.isCurrentMonth
                    ? 'opacity-35 bg-white/[0.02] border-white/5 hover:opacity-60'
                    : isSelected
                    ? 'bg-gradient-to-b from-cyan-950/80 to-blue-950/80 border-cyan-400 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/20 scale-[1.01]'
                    : cell.isOfficialClassDate
                    ? 'bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-500/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                }`}
              >
                {/* Cabecera de la celda: Número de día y marcas */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-black font-mono ${
                      isToday
                        ? 'px-1.5 py-0.5 rounded-lg bg-cyan-400 text-black shadow-md'
                        : isSelected
                        ? 'text-cyan-300'
                        : cell.isOfficialClassDate
                        ? 'text-emerald-300 font-bold'
                        : 'text-gray-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isOfficialClassDate && (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"
                      title="Fecha oficial de clase"
                    />
                  )}
                </div>

                {/* Badges de Asistencia y Participación en la celda */}
                {cell.hasRecords ? (
                  <div className="space-y-1 w-full pt-1">
                    {/* Badge Asistencia */}
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span>✓ {cell.stats.presentes}</span>
                      {cell.stats.faltas > 0 && <span className="text-rose-400">✗ {cell.stats.faltas}</span>}
                    </div>

                    {/* Badge Participación */}
                    {cell.stats.participaciones > 0 && (
                      <div className="flex items-center space-x-1 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 truncate">
                        <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                        <span className="truncate">{cell.stats.participaciones} ({cell.stats.puntos}p)</span>
                      </div>
                    )}
                  </div>
                ) : cell.isOfficialClassDate ? (
                  <div className="text-[9px] text-emerald-400/80 italic font-mono pt-1">
                    Sesión oficial
                  </div>
                ) : (
                  <div />
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda del Calendario */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-[11px] text-gray-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Fecha Oficial de Clase</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Día de Hoy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Con Participaciones</span>
            </span>
          </div>

          <span className="text-gray-400 font-mono text-[10px]">
            Haz clic en cualquier día para desplegar la lista completa de alumnos con su asistencia y participación.
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. PANEL DE INSPECCIÓN DEL DÍA SELECCIONADO                              */}
      {/* ========================================================================= */}
      {selectedDayData && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#0B1426] to-[#070D19] border border-cyan-500/40 shadow-2xl space-y-5 animate-fadeIn">
          
          {/* Header del Día */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-xs uppercase border border-cyan-500/40">
                  {selectedDayData.isOfficialClass ? '🏛️ Sesión Oficial UNRC' : '📅 Registro en Bitácora'}
                </span>
                <span className="text-gray-400 text-xs font-mono">{selectedDayData.date}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white capitalize pt-1">
                {formatFriendlyDate(selectedDayData.date)}
              </h3>
              <p className="text-xs text-gray-300">
                Grupo {courseGrupo || 'Oficial'} • {courseMateria || courseName}
              </p>
            </div>

            {/* Acciones para el día seleccionado */}
            <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
              {onSelectDateForEditing && (
                <button
                  type="button"
                  onClick={() => onSelectDateForEditing(selectedDayData.date)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-600/20 cursor-pointer"
                  title="Cargar esta fecha en la pestaña de Toma Diaria para editar asistencias o participaciones"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Pasar Lista / Editar Día</span>
                </button>
              )}

              {onUpdateGoogleSheetForDate && (
                <button
                  type="button"
                  onClick={() => onUpdateGoogleSheetForDate(selectedDayData.date)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  title="Sincronizar y enviar la columna de este día a la Hoja de Google Sheets del grupo"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Actualizar Google Sheets</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportDayExcel}
                className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/20 text-white font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Descargar la lista de asistencia y participación de este día en archivo Excel"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar Día (.xlsx)</span>
              </button>
            </div>

          </div>

          {/* Mini KPI Cards del Día */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center">
              <span className="text-[10px] text-gray-400 font-bold block">Alumnos Evaluados</span>
              <span className="text-base font-black text-white">{selectedDayData.stats.totalStudents}</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <span className="text-[10px] text-emerald-300 font-bold block">Presentes (A)</span>
              <span className="text-base font-black text-emerald-400">
                {selectedDayData.stats.presCount} ({selectedDayData.stats.pct}%)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
              <span className="text-[10px] text-amber-300 font-bold block">Retardos (R)</span>
              <span className="text-base font-black text-amber-400">{selectedDayData.stats.retCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
              <span className="text-[10px] text-rose-300 font-bold block">Inasistencias (F)</span>
              <span className="text-base font-black text-rose-400">{selectedDayData.stats.falCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center">
              <span className="text-[10px] text-blue-300 font-bold block">Justificados (J)</span>
              <span className="text-base font-black text-blue-400">{selectedDayData.stats.justCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-500/40 text-center">
              <span className="text-[10px] text-amber-300 font-bold block">Participaciones</span>
              <span className="text-base font-black text-amber-300">
                {selectedDayData.stats.totalParts} ({selectedDayData.stats.totalPts} pts)
              </span>
            </div>
          </div>

          {/* Filtros de Tabla */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Buscar por matrícula o nombre de alumno..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Todos los Estados ({selectedDayData.studentRows.length})</option>
                <option value="present">Solo Presentes</option>
                <option value="late">Solo Retardos</option>
                <option value="absent">Solo Inasistencias</option>
                <option value="excused">Solo Justificados</option>
              </select>
            </div>

          </div>

          {/* Tabla de Alumnos: Matrícula, Nombre, Día, Asistencia y Participación */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-black/90 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 text-center w-12">No.</th>
                  <th className="p-3.5">Matrícula</th>
                  <th className="p-3.5">Nombre del Alumno</th>
                  <th className="p-3.5 text-center">Día / Fecha</th>
                  <th className="p-3.5 text-center">Asistencia</th>
                  <th className="p-3.5 text-center">Participación</th>
                  <th className="p-3.5">Observaciones de Clase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-black/40">
                {filteredStudentsOfDay.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      No se encontraron alumnos con el filtro seleccionado para este día.
                    </td>
                  </tr>
                ) : (
                  filteredStudentsOfDay.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.04] transition-colors">
                      {/* No. */}
                      <td className="p-3.5 text-center font-mono text-gray-400 text-[11px]">
                        {row.num}
                      </td>

                      {/* Matrícula */}
                      <td className="p-3.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          {row.matricula}
                        </span>
                      </td>

                      {/* Nombre Completo */}
                      <td className="p-3.5 font-bold text-white whitespace-nowrap">
                        {row.name}
                      </td>

                      {/* Día / Fecha */}
                      <td className="p-3.5 text-center font-mono text-cyan-300 font-semibold whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* Asistencia */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            row.status === 'present'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : row.status === 'late'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : row.status === 'excused'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {row.status === 'present' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Presente (A)</span>
                            </>
                          ) : row.status === 'late' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Retardo (R)</span>
                            </>
                          ) : row.status === 'excused' ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Justificado (J)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Falta (F)</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Participación */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {row.partType !== 'NINGUNA' || row.points > 0 ? (
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                              row.hasDoublePart
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black border-amber-300 shadow-md shadow-amber-400/20'
                                : row.partType === 'AP'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : row.partType === 'REGULAR'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                            }`}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>
                              {row.hasDoublePart
                                ? `Doble ⭐ (+${row.points} pts)`
                                : row.partType === 'AP'
                                ? `Excelente (+${row.points} pts)`
                                : row.partType === 'REGULAR'
                                ? `Buena (+${row.points} pts)`
                                : `Mínima (+${row.points} pts)`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-mono italic">
                            Sin participación
                          </span>
                        )}
                      </td>

                      {/* Observaciones */}
                      <td className="p-3.5 text-gray-300 text-[11px] max-w-xs truncate">
                        {row.observations || (
                          <span className="text-gray-400 italic">Asistencia regular en aula</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
