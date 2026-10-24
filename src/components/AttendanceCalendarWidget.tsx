"use client";

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Trash2,
  UploadCloud,
  Edit3,
  CalendarDays,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import type { Asistencia, Participacion } from '@/lib/db';
import { formatDatePill } from '@/lib/googleSheetsSync';

interface AttendanceCalendarWidgetProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  allAsistencias: Asistencia[];
  allParticipaciones: Participacion[];
  classDates?: string[];
  courseMateria?: string;
  courseGrupo?: string;
  onDeleteRecordsForDate?: (dateStr: string) => Promise<void> | void;
  onSyncGoogleSheetForDate?: (dateStr: string) => Promise<void> | void;
  className?: string;
  compact?: boolean;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AttendanceCalendarWidget({
  selectedDate,
  onSelectDate,
  allAsistencias = [],
  allParticipaciones = [],
  classDates = [],
  courseMateria,
  courseGrupo,
  onDeleteRecordsForDate,
  onSyncGoogleSheetForDate,
  className = '',
  compact = false,
}: AttendanceCalendarWidgetProps) {
  // Inicializar mes/año basado en selectedDate
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState<number>(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => initialDate.getMonth()); // 0-11
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Navegación de mes
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
    onSelectDate(todayStr);
  };

  const handleSelectDay = (dateStr: string) => {
    onSelectDate(dateStr);
    setShowConfirmDelete(false);
  };

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

  const classDatesSet = useMemo(() => new Set(classDates), [classDates]);

  // Celdas del mes
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isOfficialClass: boolean;
      hasAttendance: boolean;
      hasParticipations: boolean;
      presentesCount: number;
      faltasCount: number;
      partsCount: number;
      totalPoints: number;
    }> = [];

    // Celdas mes anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayAsist = asistenciasByDate.get(dStr) || [];
      const dayParts = participacionesByDate.get(dStr) || [];

      cells.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isOfficialClass: classDatesSet.has(dStr),
        hasAttendance: dayAsist.length > 0,
        hasParticipations: dayParts.length > 0,
        presentesCount: dayAsist.filter((a) => a.estado === 'A' || a.estado === 'R').length,
        faltasCount: dayAsist.filter((a) => a.estado === 'F').length,
        partsCount: dayParts.length,
        totalPoints: dayParts.reduce((acc, p) => acc + (p.puntos || 0), 0),
      });
    }

    // Celdas mes actual
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayAsist = asistenciasByDate.get(dStr) || [];
      const dayParts = participacionesByDate.get(dStr) || [];

      cells.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: true,
        isOfficialClass: classDatesSet.has(dStr),
        hasAttendance: dayAsist.length > 0,
        hasParticipations: dayParts.length > 0,
        presentesCount: dayAsist.filter((a) => a.estado === 'A' || a.estado === 'R').length,
        faltasCount: dayAsist.filter((a) => a.estado === 'F').length,
        partsCount: dayParts.length,
        totalPoints: dayParts.reduce((acc, p) => acc + (p.puntos || 0), 0),
      });
    }

    // Celdas mes posterior
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayAsist = asistenciasByDate.get(dStr) || [];
      const dayParts = participacionesByDate.get(dStr) || [];

      cells.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: false,
        isOfficialClass: classDatesSet.has(dStr),
        hasAttendance: dayAsist.length > 0,
        hasParticipations: dayParts.length > 0,
        presentesCount: dayAsist.filter((a) => a.estado === 'A' || a.estado === 'R').length,
        faltasCount: dayAsist.filter((a) => a.estado === 'F').length,
        partsCount: dayParts.length,
        totalPoints: dayParts.reduce((acc, p) => acc + (p.puntos || 0), 0),
      });
    }

    return cells;
  }, [currentYear, currentMonth, asistenciasByDate, participacionesByDate, classDatesSet]);

  // Estadísticas del día seleccionado actualmente
  const selectedDayStats = useMemo(() => {
    if (!selectedDate) return null;
    const dayAsist = asistenciasByDate.get(selectedDate) || [];
    const dayParts = participacionesByDate.get(selectedDate) || [];

    const pres = dayAsist.filter((a) => a.estado === 'A').length;
    const ret = dayAsist.filter((a) => a.estado === 'R').length;
    const fal = dayAsist.filter((a) => a.estado === 'F').length;
    const just = dayAsist.filter((a) => a.estado === 'J').length;
    const totalAlumnos = dayAsist.length;
    const totalPts = dayParts.reduce((sum, p) => sum + (p.puntos || 0), 0);

    const isToday =
      selectedDate ===
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
        new Date().getDate()
      ).padStart(2, '0')}`;

    const isPast = selectedDate < `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    return {
      dateStr: selectedDate,
      hasRecords: dayAsist.length > 0 || dayParts.length > 0,
      totalAlumnos,
      pres,
      ret,
      fal,
      just,
      partsCount: dayParts.length,
      totalPts,
      isOfficialClass: classDatesSet.has(selectedDate),
      isToday,
      isPast,
    };
  }, [selectedDate, asistenciasByDate, participacionesByDate, classDatesSet]);

  // Formato amigable de fecha en español
  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleDeleteClick = async () => {
    if (!onDeleteRecordsForDate) return;
    setIsDeleting(true);
    try {
      await onDeleteRecordsForDate(selectedDate);
      setShowConfirmDelete(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-b from-[#091426] via-[#07111F] to-[#040810] border border-cyan-500/30 p-4 sm:p-5 shadow-2xl space-y-4 ${className}`}
    >
      {/* ========================================================================= */}
      {/* 1. CABECERA: TÍTULO, CONTROLES DE MES Y BOTÓN HOY                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-inner">
            <CalendarDays className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Calendario de Asistencias & Participaciones
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-black">
                UNRC
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Selecciona cualquier fecha para ver el histórico, modificar estados o borrar registros.
            </p>
          </div>
        </div>

        {/* Controles de Navegación del Mes */}
        <div className="flex items-center space-x-1.5 self-stretch sm:self-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white hover:text-cyan-400 transition-all cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-white font-extrabold text-xs text-center min-w-[140px] shadow-inner">
            <span className="text-cyan-300 capitalize">{MONTH_NAMES_ES[currentMonth]}</span>{' '}
            <span className="text-gray-300 font-mono">{currentYear}</span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white hover:text-cyan-400 transition-all cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all cursor-pointer"
            title="Ir a hoy"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRILLA DEL MES (LUN A DOM)                                             */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        {/* Nombres de los días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 uppercase py-1 border-b border-white/5">
          {WEEKDAY_NAMES_ES.map((dName, idx) => (
            <div key={dName} className={idx >= 5 ? 'text-amber-400/80' : ''}>
              {dName}
            </div>
          ))}
        </div>

        {/* Celdas de los días */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((cell) => {
            const isSelected = selectedDate === cell.dateStr;
            const isToday =
              cell.dateStr ===
              `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
                new Date().getDate()
              ).padStart(2, '0')}`;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleSelectDay(cell.dateStr)}
                className={`relative min-h-[52px] sm:min-h-[58px] p-1 sm:p-1.5 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer border ${
                  !cell.isCurrentMonth
                    ? 'opacity-30 bg-white/[0.01] border-white/5 hover:opacity-50'
                    : isSelected
                    ? 'bg-gradient-to-b from-cyan-950 to-blue-950 border-cyan-400 ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-500/30 scale-[1.02]'
                    : cell.hasAttendance
                    ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/30'
                    : cell.isOfficialClass
                    ? 'bg-blue-950/20 hover:bg-blue-950/40 border-blue-500/30'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10'
                }`}
              >
                {/* Cabecera del día: número e indicador oficial */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-black ${
                      isToday
                        ? 'px-1 rounded bg-cyan-400 text-black shadow-sm'
                        : isSelected
                        ? 'text-cyan-300 font-extrabold'
                        : cell.isOfficialClass
                        ? 'text-emerald-300 font-bold'
                        : 'text-gray-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isOfficialClass && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"
                      title="Fecha oficial de clase"
                    />
                  )}
                </div>

                {/* Badges / Indicadores inferiores de la celda */}
                <div className="flex flex-wrap items-center gap-1 w-full pt-1">
                  {cell.hasAttendance && (
                    <span
                      className="px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-0.5 truncate"
                      title={`${cell.presentesCount} presentes`}
                    >
                      <span>✓</span>
                      <span>{cell.presentesCount}</span>
                    </span>
                  )}

                  {cell.hasParticipations && (
                    <span
                      className="px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-0.5 truncate"
                      title={`${cell.partsCount} participaciones (${cell.totalPoints} pts)`}
                    >
                      <Star className="w-2 h-2 fill-current shrink-0" />
                      <span>{cell.partsCount}</span>
                    </span>
                  )}

                  {!cell.hasAttendance && !cell.hasParticipations && cell.isOfficialClass && (
                    <span className="text-[8px] text-blue-300/70 font-mono italic">
                      Sesión
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Leyenda rápida */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] text-gray-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Con Asistencia</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Con Participación</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Fecha Oficial</span>
            </span>
          </div>

          <span className="text-gray-400 font-mono text-[9px]">
            Haz clic en un día para cargarlo en el tomador
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE ACCIÓN DEL DÍA SELECCIONADO                                   */}
      {/* ========================================================================= */}
      {selectedDayStats && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-cyan-500/40 shadow-inner space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] uppercase border border-cyan-500/30">
                  {selectedDayStats.isToday
                    ? '📅 DÍA DE HOY'
                    : selectedDayStats.isPast
                    ? '⏮️ HISTÓRICO'
                    : '📅 PROGRAMADO'}
                </span>
                <span className="text-gray-400 text-xs font-mono">{selectedDayStats.dateStr}</span>
                {selectedDayStats.isOfficialClass && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    🏛️ Sesión Oficial
                  </span>
                )}
              </div>
              <h4 className="text-sm sm:text-base font-black text-white capitalize pt-1">
                {formatFriendlyDate(selectedDayStats.dateStr)}
              </h4>
            </div>

            {/* Badges de resumen para la fecha seleccionada */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedDayStats.hasRecords ? (
                <>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedDayStats.pres} Presentes</span>
                  </span>
                  {selectedDayStats.fal > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{selectedDayStats.fal} Faltas</span>
                    </span>
                  )}
                  {selectedDayStats.partsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{selectedDayStats.partsCount} Part. ({selectedDayStats.totalPts} pts)</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs italic">
                  Sin registros guardados para esta fecha
                </span>
              )}
            </div>
          </div>

          {/* Botones de acción del día */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="text-[11px] text-gray-300 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {selectedDayStats.hasRecords
                  ? 'Puedes modificar asistencias o participaciones directamente en la lista o borrarlas.'
                  : 'Pasa lista o registra participaciones para guardar este día de forma permanente.'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Botón Sincronizar Google Sheets */}
              {onSyncGoogleSheetForDate && (
                <button
                  type="button"
                  onClick={() => onSyncGoogleSheetForDate(selectedDayStats.dateStr)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  title="Subir esta fecha a Google Sheets"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Subir a Google Sheets</span>
                </button>
              )}

              {/* Botón Borrar Registros de la Fecha */}
              {selectedDayStats.hasRecords && onDeleteRecordsForDate && (
                <>
                  {!showConfirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      title="Eliminar de la BD las asistencias y participaciones de este día"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar Registros</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1.5 bg-rose-950/80 p-1 rounded-xl border border-rose-500/50 animate-fadeIn">
                      <span className="text-[10px] text-rose-200 font-bold px-1.5">
                        ¿Confirmar borrado?
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? 'Borrando...' : 'Sí, borrar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
