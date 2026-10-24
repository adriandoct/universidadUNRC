"use client";

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  ExternalLink,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Star,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Award,
  Check
} from 'lucide-react';
import type { Asistencia, Participacion } from '@/lib/db';
import type { StudentItem } from './AttendanceSheet';
import {
  CourseGoogleSheetConfig,
  formatDateColumnLabel,
  generateGroupMatrixData,
  exportGroupSecondaryBackupExcel,
  exportGroupSecondaryBackupCsv
} from '@/lib/googleSheetsSync';
import confetti from 'canvas-confetti';

interface GroupBackupSpreadsheetProps {
  courseId: string;
  courseName: string;
  courseMateria?: string;
  courseGrupo?: string;
  carrera?: string;
  docenteNombre?: string;
  ciclo?: string;
  students: StudentItem[];
  allAsistencias: Asistencia[];
  allParticipaciones: Participacion[];
  sheetConfig?: CourseGoogleSheetConfig | null;
  classDates: string[];
  onSyncGoogleSheet?: () => void;
  onUpdateGoogleSheet?: () => void;
  onUpdateAllGoogleSheets?: () => void;
  onSyncAllGoogleSheets?: () => void;
  onNavigateToDate?: (dateStr: string) => void;
}

export default function GroupBackupSpreadsheet({
  courseId,
  courseName,
  courseMateria,
  courseGrupo,
  carrera = 'Licenciatura Oficial UNRC',
  docenteNombre = 'Dr. Adrian Silva',
  ciclo = '2026-2',
  students,
  allAsistencias,
  allParticipaciones,
  sheetConfig,
  classDates = [],
  onSyncGoogleSheet,
  onUpdateGoogleSheet,
  onUpdateAllGoogleSheets,
  onSyncAllGoogleSheets,
  onNavigateToDate,
}: GroupBackupSpreadsheetProps) {
  const [viewMode, setViewMode] = useState<'matrix' | 'detailed'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'excused'>('all');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const activeMateria = courseMateria || courseName;
  const activeGrupo = courseGrupo || sheetConfig?.grupo || 'Grupo';

  // Combinar fechas oficiales del curso con cualquier fecha registrada en asistencias o participaciones
  const datesToUse = useMemo(() => {
    const dateSet = new Set<string>();

    if (sheetConfig?.classDates && sheetConfig.classDates.length > 0) {
      sheetConfig.classDates.forEach((d) => dateSet.add(d));
    }
    if (classDates && classDates.length > 0) {
      classDates.forEach((d) => dateSet.add(d));
    }
    allAsistencias.forEach((a) => {
      if (a.fecha) dateSet.add(a.fecha);
    });
    allParticipaciones.forEach((p) => {
      if (p.fecha) dateSet.add(p.fecha);
    });

    return Array.from(dateSet).sort();
  }, [sheetConfig, classDates, allAsistencias, allParticipaciones]);

  // Calcular la matriz oficial completa de asistencia y participación para este grupo
  const matrix = useMemo(() => {
    return generateGroupMatrixData({
      students,
      dates: datesToUse,
      asistencias: allAsistencias,
      participaciones: allParticipaciones,
      courseId,
      materia: activeMateria,
      grupo: activeGrupo,
    });
  }, [students, datesToUse, allAsistencias, allParticipaciones, courseId, activeMateria, activeGrupo]);

  // Filtrado de filas en la matriz
  const filteredMatrixRows = useMemo(() => {
    return matrix.rows.filter(
      (r) =>
        r.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.matricula.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matrix.rows, searchQuery]);

  // Lista detallada (fila por fila: alumno x día)
  const detailedList = useMemo(() => {
    const list: Array<{
      num: number;
      matricula: string;
      nombre: string;
      date: string;
      dateLabel: string;
      asistencia: 'A' | 'R' | 'F' | 'J';
      asistenciaLabel: string;
      participacion: string;
      participacionLabel: string;
      rawCode: string;
      puntos: number;
      observaciones: string;
    }> = [];

    let count = 1;
    matrix.rows.forEach((st) => {
      datesToUse.forEach((d) => {
        const item = st.dates[d];
        if (!item) return;

        list.push({
          num: count++,
          matricula: st.matricula,
          nombre: st.nombre,
          date: d,
          dateLabel: formatDateColumnLabel(d),
          asistencia: item.asistencia,
          asistenciaLabel: item.asistenciaLabel,
          participacion: item.participacion,
          participacionLabel: item.participacionLabel,
          rawCode: item.rawCode,
          puntos: item.puntos,
          observaciones: item.observaciones,
        });
      });
    });

    return list;
  }, [matrix.rows, datesToUse]);

  // Filtrado de la lista detallada
  const filteredDetailedList = useMemo(() => {
    return detailedList.filter((row) => {
      const matchSearch =
        row.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.matricula.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDate = selectedDateFilter === 'all' || row.date === selectedDateFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'present' && row.asistencia === 'A') ||
        (statusFilter === 'late' && row.asistencia === 'R') ||
        (statusFilter === 'absent' && row.asistencia === 'F') ||
        (statusFilter === 'excused' && row.asistencia === 'J');

      return matchSearch && matchDate && matchStatus;
    });
  }, [detailedList, searchQuery, selectedDateFilter, statusFilter]);

  // Manejador de descarga de Respaldo Secundario en Excel (.xlsx)
  const handleDownloadExcelBackup = () => {
    try {
      exportGroupSecondaryBackupExcel({
        courseMateria: activeMateria,
        courseGrupo: activeGrupo,
        carrera,
        docenteNombre,
        ciclo,
        students,
        dates: datesToUse,
        asistencias: allAsistencias,
        participaciones: allParticipaciones,
      });

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}

      setDownloadSuccessToast(
        `📥 Respaldo Secundario Oficial en Excel descargado para "${activeMateria}" (${activeGrupo}). Incluye Sábana Matriz e Historial Detallado.`
      );
      setTimeout(() => setDownloadSuccessToast(null), 8000);
    } catch (err: any) {
      alert(`Error descargando respaldo Excel: ${err?.message || err}`);
    }
  };

  // Manejador de descarga de Respaldo Secundario en CSV
  const handleDownloadCsvBackup = () => {
    try {
      exportGroupSecondaryBackupCsv({
        courseMateria: activeMateria,
        courseGrupo: activeGrupo,
        students,
        dates: datesToUse,
        asistencias: allAsistencias,
        participaciones: allParticipaciones,
      });

      setDownloadSuccessToast(
        `📄 Respaldo Secundario en CSV generado con éxito para "${activeMateria}" (${activeGrupo}).`
      );
      setTimeout(() => setDownloadSuccessToast(null), 6000);
    } catch (err: any) {
      alert(`Error descargando respaldo CSV: ${err?.message || err}`);
    }
  };

  // Estilo visual de celda según el código oficial de la UNRC
  const getCellBadgeStyle = (code: string) => {
    if (code === 'App') {
      return 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black border-amber-300 shadow-md shadow-amber-400/30';
    }
    if (code === 'Ap') {
      return 'bg-amber-500/25 text-amber-300 font-extrabold border-amber-500/50';
    }
    if (code === 'A') {
      return 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40';
    }
    if (code === 'Rp' || code === 'Rpp') {
      return 'bg-amber-600/30 text-amber-200 font-bold border-amber-500/50';
    }
    if (code === 'R') {
      return 'bg-yellow-500/20 text-yellow-300 font-bold border-yellow-500/40';
    }
    if (code === 'J') {
      return 'bg-blue-500/20 text-blue-300 font-bold border-blue-500/40';
    }
    return 'bg-rose-500/20 text-rose-300 font-bold border-rose-500/40'; // F
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. HEADER DE LA HOJA DE CÁLCULO Y ACCIONES DE RESPALDO                    */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#07241A] via-[#0A262C] to-[#0D182E] border border-emerald-500/40 shadow-2xl space-y-4">
        
        {/* Fila Superior: Título, Metadatos y Enlace Oficial */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Hoja de Cálculo Oficial & Respaldo Secundario
                </h2>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Respaldo Activo</span>
                </span>
                {sheetConfig && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                    {sheetConfig.badgeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-200/90 pt-0.5">
                Grupo <span className="font-bold text-white font-mono">{activeGrupo}</span> • {activeMateria} • {docenteNombre} • Ciclo {ciclo}
              </p>
            </div>
          </div>

          {/* Botones Principales de Respaldo y Google Sheets */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
            
            {/* BOTÓN PRIMARIO: DESCARGAR RESPALDO SECUNDARIO (.XLSX) */}
            <button
              type="button"
              onClick={handleDownloadExcelBackup}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center space-x-2 cursor-pointer"
              title="Descargar libro de cálculo en Excel con la Sábana General y el Historial Detallado de este grupo"
            >
              <Download className="w-4 h-4 text-black" />
              <span>Descargar Respaldo Secundario (.xlsx)</span>
            </button>

            {/* BOTÓN CSV */}
            <button
              type="button"
              onClick={handleDownloadCsvBackup}
              className="px-3.5 py-2.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 text-white font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Descargar el respaldo secundario en formato plano CSV"
            >
              <span>CSV</span>
            </button>

            {/* Enlace a Google Sheets Oficial si existe */}
            {sheetConfig?.sheetUrl && (
              <a
                href={sheetConfig.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-black/60 hover:bg-black/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Abrir la hoja de cálculo de Google Sheets en la nube"
              >
                <span>Ver Hoja Google</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            )}

            {/* Botón Sincronizar / Actualizar Materia Actual */}
            {onUpdateGoogleSheet && (
              <button
                type="button"
                onClick={onUpdateGoogleSheet}
                className="px-3 py-2.5 rounded-xl bg-black/60 hover:bg-black/80 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Actualizar la hoja de Google Sheets con las asistencias registradas"
              >
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>Actualizar Hoja</span>
              </button>
            )}

            {/* Botón Actualizar TODAS las Materias */}
            {onUpdateAllGoogleSheets && (
              <button
                type="button"
                onClick={onUpdateAllGoogleSheets}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/30 to-amber-600/30 hover:from-amber-500/50 hover:to-amber-600/50 border border-amber-400/40 text-amber-300 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-amber-950/40"
                title="Actualizar las hojas de cálculo de Google Sheets de TODAS las 5 materias oficiales"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                <span>Actualizar Todas las Materias</span>
              </button>
            )}

            {/* Botón Sincronizar TODAS las Materias */}
            {onSyncAllGoogleSheets && (
              <button
                type="button"
                onClick={onSyncAllGoogleSheets}
                className="px-3 py-2.5 rounded-xl bg-black/60 hover:bg-black/80 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Sincronizar las 5 materias oficiales desde Google Sheets"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sincronizar Todo</span>
              </button>
            )}

          </div>

        </div>

        {/* Fila Inferior: 4 Tarjetas de Estadísticas Globales del Grupo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
          
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-gray-400 uppercase font-bold block truncate">Alumnos en Hoja</span>
              <span className="text-base font-black text-white">{matrix.totalStudents} estudiantes</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-cyan-500/20 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-cyan-300/80 uppercase font-bold block truncate">Sesiones Oficiales</span>
              <span className="text-base font-black text-cyan-300">{matrix.totalDates} fechas de clase</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-emerald-300/80 uppercase font-bold block truncate">Promedio Asistencia</span>
              <span className="text-base font-black text-emerald-300">{matrix.promedioAsistenciaGlobal}%</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-amber-300/80 uppercase font-bold block truncate">Participaciones</span>
              <span className="text-base font-black text-amber-300">{matrix.totalPuntosGlobal} pts acumulados</span>
            </div>
          </div>

        </div>

      </div>

      {/* Toast de confirmación de descarga */}
      {downloadSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccessToast}</span>
          </div>
          <button onClick={() => setDownloadSuccessToast(null)} className="text-gray-400 hover:text-white text-xs ml-3">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BARRA DE CONTROLES Y SELECTOR DE VISTAS                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Toggle de Vistas: Sábana Matriz vs Lista Detallada */}
        <div className="inline-flex p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>📊 Vista Matriz Sábana (Fechas x Alumnos)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              viewMode === 'detailed'
                ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📋 Vista Detallada (Fila por Fila)</span>
          </button>
        </div>

        {/* Buscador de alumnos */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por matrícula o alumno..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-emerald-400 transition-colors"
          />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. VISTA MATRIZ SÁBANA (ESTILO HOJA DE CÁLCULO OFICIAL UNRC)               */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="space-y-3">
          
          <div className="overflow-x-auto rounded-3xl border border-emerald-500/30 shadow-2xl bg-black/60">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Encabezado Principal */}
              <thead className="bg-[#0A1624] text-gray-300 uppercase text-[10px] font-black sticky top-0 z-10 border-b border-emerald-500/30">
                <tr>
                  <th className="p-3 text-center w-10 border-r border-white/10 sticky left-0 bg-[#0A1624] z-20">
                    No.
                  </th>
                  <th className="p-3 w-32 border-r border-white/10 sticky left-10 bg-[#0A1624] z-20">
                    Matrícula
                  </th>
                  <th className="p-3 min-w-[200px] border-r border-white/10 sticky left-42 bg-[#0A1624] z-20 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                    Nombre del Alumno
                  </th>

                  {/* Columnas para cada fecha de clase */}
                  {datesToUse.map((dStr) => (
                    <th
                      key={dStr}
                      className="p-2 text-center min-w-[68px] border-r border-white/10 whitespace-nowrap"
                    >
                      <button
                        type="button"
                        onClick={() => onNavigateToDate && onNavigateToDate(dStr)}
                        className="hover:text-emerald-300 hover:underline cursor-pointer"
                        title={`Ver o editar asistencia del día ${dStr}`}
                      >
                        {formatDateColumnLabel(dStr)}
                      </button>
                    </th>
                  ))}

                  {/* Columnas de Totales Acumulados */}
                  <th className="p-3 text-center min-w-[70px] bg-emerald-950/40 text-emerald-300 border-r border-white/10">
                    Asist (A)
                  </th>
                  <th className="p-3 text-center min-w-[65px] bg-amber-950/30 text-amber-300 border-r border-white/10">
                    Ret (R)
                  </th>
                  <th className="p-3 text-center min-w-[65px] bg-rose-950/30 text-rose-300 border-r border-white/10">
                    Falt (F)
                  </th>
                  <th className="p-3 text-center min-w-[75px] bg-amber-950/40 text-amber-200 border-r border-white/10">
                    Part. Total
                  </th>
                  <th className="p-3 text-center min-w-[80px] bg-amber-500/10 text-amber-300 border-r border-white/10">
                    Puntos (pts)
                  </th>
                  <th className="p-3 text-center min-w-[85px] bg-emerald-500/15 text-emerald-300 font-extrabold">
                    % Asistencia
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de Alumnos */}
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {filteredMatrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={datesToUse.length + 9} className="p-8 text-center text-gray-500 italic">
                      No se encontraron alumnos con el criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredMatrixRows.map((st) => (
                    <tr key={st.id} className="hover:bg-white/[0.04] transition-colors">
                      {/* No. */}
                      <td className="p-3 text-center text-gray-400 text-[11px] border-r border-white/10 sticky left-0 bg-[#070D18] z-10">
                        {st.num}
                      </td>

                      {/* Matrícula */}
                      <td className="p-3 text-emerald-400 font-bold border-r border-white/10 sticky left-10 bg-[#070D18] z-10 whitespace-nowrap">
                        {st.matricula}
                      </td>

                      {/* Nombre Completo */}
                      <td className="p-3 font-sans font-bold text-white border-r border-white/10 sticky left-42 bg-[#070D18] z-10 whitespace-nowrap shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                        {st.nombre}
                      </td>

                      {/* Celdas de Fecha con Código Oficial */}
                      {datesToUse.map((dStr) => {
                        const cell = st.dates[dStr];
                        const code = cell?.rawCode || 'A';
                        return (
                          <td
                            key={dStr}
                            className="p-1.5 text-center border-r border-white/10"
                            title={`${st.nombre} • ${dStr}: ${cell?.asistenciaLabel || 'Presente'} • ${cell?.participacionLabel || 'Sin Participación'} • ${cell?.puntos || 0} pts`}
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${getCellBadgeStyle(
                                code
                              )}`}
                            >
                              {code}
                            </span>
                          </td>
                        );
                      })}

                      {/* Totales */}
                      <td className="p-3 text-center text-emerald-300 font-bold bg-emerald-950/20 border-r border-white/10">
                        {st.totalAsistencias}
                      </td>
                      <td className="p-3 text-center text-amber-300 bg-amber-950/15 border-r border-white/10">
                        {st.totalRetardos}
                      </td>
                      <td className="p-3 text-center text-rose-300 bg-rose-950/15 border-r border-white/10">
                        {st.totalFaltas}
                      </td>
                      <td className="p-3 text-center text-amber-200 font-bold bg-amber-950/20 border-r border-white/10">
                        {st.totalParticipaciones}
                      </td>
                      <td className="p-3 text-center text-amber-300 font-black bg-amber-500/10 border-r border-white/10">
                        {st.totalPuntos}
                      </td>
                      <td className="p-3 text-center bg-emerald-500/10">
                        <span
                          className={`font-black ${
                            st.porcentajeAsistencia >= 80
                              ? 'text-emerald-300'
                              : st.porcentajeAsistencia >= 60
                              ? 'text-yellow-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {st.porcentajeAsistencia}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Fila de Totales por Fecha */}
              <tfoot className="bg-[#0A1624] text-xs font-bold border-t border-emerald-500/30">
                <tr>
                  <td colSpan={3} className="p-3 text-right uppercase text-gray-400 font-black tracking-wider border-r border-white/10 sticky left-0 bg-[#0A1624] z-20 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                    Totales Presentes por Fecha:
                  </td>

                  {datesToUse.map((dStr) => {
                    const st = matrix.dateStats[dStr];
                    return (
                      <td key={dStr} className="p-2 text-center text-[10px] border-r border-white/10">
                        <div className="text-emerald-400 font-bold">{st?.presentes || 0} pres</div>
                        {st?.participaciones ? (
                          <div className="text-amber-400 text-[9px]">★ {st.participaciones}</div>
                        ) : null}
                      </td>
                    );
                  })}

                  <td className="p-3 text-center text-emerald-300 font-black bg-emerald-950/40 border-r border-white/10">
                    {matrix.rows.reduce((s, r) => s + r.totalAsistencias, 0)}
                  </td>
                  <td className="p-3 text-center text-amber-300 font-black bg-amber-950/30 border-r border-white/10">
                    {matrix.rows.reduce((s, r) => s + r.totalRetardos, 0)}
                  </td>
                  <td className="p-3 text-center text-rose-300 font-black bg-rose-950/30 border-r border-white/10">
                    {matrix.rows.reduce((s, r) => s + r.totalFaltas, 0)}
                  </td>
                  <td className="p-3 text-center text-amber-200 font-black bg-amber-950/40 border-r border-white/10">
                    {matrix.rows.reduce((s, r) => s + r.totalParticipaciones, 0)}
                  </td>
                  <td className="p-3 text-center text-amber-300 font-black bg-amber-500/10 border-r border-white/10">
                    {matrix.totalPuntosGlobal}
                  </td>
                  <td className="p-3 text-center text-emerald-300 font-black bg-emerald-500/20">
                    {matrix.promedioAsistenciaGlobal}%
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VISTA DETALLADA FILA POR FILA (ALUMNO X DÍA)                           */}
      {/* ========================================================================= */}
      {viewMode === 'detailed' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros para Lista Detallada */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/40 border border-white/10">
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <label className="text-xs text-gray-300 font-bold">Filtrar Fecha:</label>
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/70 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-emerald-400"
              >
                <option value="all">Todas las Fechas ({datesToUse.length} clases)</option>
                {datesToUse.map((d) => (
                  <option key={d} value={d}>
                    {d} ({formatDateColumnLabel(d)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <label className="text-xs text-gray-300 font-bold">Estado:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-black/70 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Todos los Estados</option>
                <option value="present">Solo Presentes</option>
                <option value="late">Solo Retardos</option>
                <option value="absent">Solo Inasistencias</option>
                <option value="excused">Solo Justificados</option>
              </select>
            </div>

            <span className="text-xs text-gray-400 font-mono">
              Mostrando {filteredDetailedList.length} registros
            </span>

          </div>

          {/* Tabla de Lista Detallada */}
          <div className="overflow-x-auto rounded-3xl border border-white/10 shadow-2xl bg-black/60">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#0A1624] text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 text-center w-12">No.</th>
                  <th className="p-3.5">Matrícula</th>
                  <th className="p-3.5">Nombre del Alumno</th>
                  <th className="p-3.5 text-center">Día / Fecha</th>
                  <th className="p-3.5 text-center">Asistencia</th>
                  <th className="p-3.5 text-center">Código UNRC</th>
                  <th className="p-3.5 text-center">Participación</th>
                  <th className="p-3.5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-black/40">
                {filteredDetailedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                      No se encontraron registros con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredDetailedList.map((row) => (
                    <tr key={`${row.matricula}-${row.date}`} className="hover:bg-white/[0.04] transition-colors">
                      <td className="p-3.5 text-center font-mono text-gray-400 text-[11px]">
                        {row.num}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          {row.matricula}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white whitespace-nowrap">
                        {row.nombre}
                      </td>
                      <td className="p-3.5 text-center font-mono text-cyan-300 font-semibold whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            row.asistencia === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : row.asistencia === 'R'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : row.asistencia === 'J'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {row.asistenciaLabel}
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-mono border ${getCellBadgeStyle(row.rawCode)}`}>
                          {row.rawCode}
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {row.puntos > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{row.participacionLabel}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Sin participación</span>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-300 text-[11px] max-w-xs truncate">
                        {row.observaciones || <span className="text-gray-400 italic">Asistencia regular en aula</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. GLOSARIO DE SIMBOLOGÍA OFICIAL UNRC                                     */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Simbología Oficial de la UNRC para Hojas de Cálculo y Respaldos Secundarios
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1 text-[11px]">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="font-mono font-black text-emerald-300 block text-xs">A</span>
            <span className="text-gray-300 text-[10px]">Presente</span>
          </div>

          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="font-mono font-black text-amber-300 block text-xs">Ap</span>
            <span className="text-gray-300 text-[10px]">+1 Part. (+10p)</span>
          </div>

          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-400/20 to-yellow-400/20 border border-amber-400/50 text-center">
            <span className="font-mono font-black text-yellow-300 block text-xs">App</span>
            <span className="text-gray-300 text-[10px]">+2 Part. (+20p)</span>
          </div>

          <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
            <span className="font-mono font-black text-yellow-300 block text-xs">R</span>
            <span className="text-gray-300 text-[10px]">Retardo</span>
          </div>

          <div className="p-2 rounded-xl bg-amber-600/15 border border-amber-600/30 text-center">
            <span className="font-mono font-black text-amber-300 block text-xs">Rp / Rpp</span>
            <span className="text-gray-300 text-[10px]">Retardo + Part.</span>
          </div>

          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
            <span className="font-mono font-black text-blue-300 block text-xs">J</span>
            <span className="text-gray-300 text-[10px]">Justificado</span>
          </div>

          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <span className="font-mono font-black text-rose-300 block text-xs">F</span>
            <span className="text-gray-300 text-[10px]">Inasistencia</span>
          </div>
        </div>
      </div>

    </div>
  );
}
