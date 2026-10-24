"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Users,
  BookOpen,
  Building,
  RefreshCw,
  Sparkles,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  ExternalLink,
  GraduationCap,
  CalendarDays,
  ShieldAlert,
  SlidersHorizontal,
  BadgeCheck
} from 'lucide-react';
import { db, Alumno, Asistencia, Participacion, Materia, Grupo, Docente } from '@/lib/db';
import { getTijuanaDateString, formatTijuanaDisplayDate } from '@/lib/tijuanaTime';
import {
  ReporteItemAlumno,
  ReporteMateriaResumen,
  exportReporteToExcel,
  exportReporteToPDF,
  exportReporteToCSV
} from '@/lib/reporteAsistenciaUtils';

interface AttendanceParticipationReportProps {
  initialMateria?: string;
  initialGrupo?: string;
  initialDate?: string;
  currentDocente?: Docente | null;
  allCoursesList?: Array<{ id: string; materia: string; grupo: string; carrera?: string }>;
  embedded?: boolean; // Si está dentro de AttendanceSheet u otra vista
}

export default function AttendanceParticipationReport({
  initialMateria = '',
  initialGrupo = '',
  initialDate,
  currentDocente,
  allCoursesList = [],
  embedded = false,
}: AttendanceParticipationReportProps) {
  // Datos crudos de la base de datos
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [participaciones, setParticipaciones] = useState<Participacion[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros interactivos
  const todayStr = useMemo(() => getTijuanaDateString(), []);
  const [selectedMateria, setSelectedMateria] = useState<string>(initialMateria);
  const [selectedGrupo, setSelectedGrupo] = useState<string>(initialGrupo);
  const [dateFilterMode, setDateFilterMode] = useState<'single' | 'range' | 'all'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getTijuanaDateString(d);
  });
  const [rangeEndDate, setRangeEndDate] = useState<string>(todayStr);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'A' | 'R' | 'F' | 'J' | 'con_participacion' | 'sin_participacion'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carga de datos inicial
  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [alumnosData, asistData, partData, matData, grpData, docData] = await Promise.all([
        db.getAlumnos(),
        db.getAsistencias(),
        db.getParticipaciones(),
        db.getMaterias(),
        db.getGrupos(),
        db.getDocentes()
      ]);

      setAlumnos(alumnosData || []);
      setAsistencias(asistData || []);
      setParticipaciones(partData || []);
      setMaterias(matData || []);
      setGrupos(grpData || []);
      setDocentes(docData || []);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Normalizador de texto para emparejar materias
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Catálogo unificado de materias disponibles
  const availableMaterias = useMemo(() => {
    const matSet = new Set<string>();

    if (initialMateria) matSet.add(initialMateria);

    allCoursesList.forEach((c) => {
      if (c.materia) matSet.add(c.materia);
    });

    materias.forEach((m) => {
      if (m.nombre) matSet.add(m.nombre);
    });

    asistencias.forEach((a) => {
      if (a.materia) matSet.add(a.materia);
    });

    participaciones.forEach((p) => {
      if (p.materia) matSet.add(p.materia);
    });

    return Array.from(matSet).filter(Boolean).sort();
  }, [initialMateria, allCoursesList, materias, asistencias, participaciones]);

  // Si no hay materia seleccionada, seleccionar la primera disponible
  useEffect(() => {
    if (!selectedMateria && availableMaterias.length > 0) {
      setSelectedMateria(initialMateria || availableMaterias[0]);
    }
  }, [availableMaterias, selectedMateria, initialMateria]);

  // Fechas que tienen registros reales para la materia seleccionada
  const recordedDatesForMateria = useMemo(() => {
    if (!selectedMateria) return [];
    const normMat = norm(selectedMateria);
    const dateSet = new Set<string>();

    asistencias.forEach((a) => {
      if (a.fecha && a.materia && norm(a.materia) === normMat) {
        dateSet.add(a.fecha);
      }
    });

    participaciones.forEach((p) => {
      if (p.fecha && p.materia && norm(p.materia) === normMat) {
        dateSet.add(p.fecha);
      }
    });

    return Array.from(dateSet).sort().reverse();
  }, [asistencias, participaciones, selectedMateria]);

  // Grupos disponibles para la materia seleccionada
  const availableGrupos = useMemo(() => {
    const grpSet = new Set<string>();
    const normMat = norm(selectedMateria);

    // Grupos asignados a esta materia en catálogo
    const matchedMateriaObj = materias.find((m) => norm(m.nombre) === normMat);
    if (matchedMateriaObj) {
      grupos
        .filter((g) => g.materia_id === matchedMateriaObj.id || norm(g.clave_grupo).includes(norm(matchedMateriaObj.clave)))
        .forEach((g) => grpSet.add(g.clave_grupo));
    }

    allCoursesList
      .filter((c) => norm(c.materia) === normMat)
      .forEach((c) => grpSet.add(c.grupo));

    // Alumnos que tienen asistencias registradas en esta materia
    asistencias
      .filter((a) => a.materia && norm(a.materia) === normMat && a.alumno?.grupo)
      .forEach((a) => grpSet.add(a.alumno!.grupo));

    return Array.from(grpSet).filter(Boolean).sort();
  }, [selectedMateria, materias, grupos, allCoursesList, asistencias]);

  // Encontrar docente titular asignado para esta materia
  const detectedDocente = useMemo(() => {
    if (currentDocente) return currentDocente;
    const normMat = norm(selectedMateria);

    // Buscar en la lista de docentes alguno que tenga esta materia asignada
    const found = docentes.find((d) => {
      if (d.materias && d.materias.some((m) => norm(m) === normMat || normMat.includes(norm(m)))) return true;
      if (d.horarios && d.horarios.some((h) => norm(h.materia) === normMat || normMat.includes(norm(h.materia)))) return true;
      return false;
    });

    return found || null;
  }, [currentDocente, selectedMateria, docentes]);

  // Determinar si una fecha entra en el filtro activo
  const isDateInFilter = (dateStr: string) => {
    if (!dateStr) return false;
    if (dateFilterMode === 'all') return true;
    if (dateFilterMode === 'single') return dateStr === selectedDate;
    if (dateFilterMode === 'range') {
      return dateStr >= rangeStartDate && dateStr <= rangeEndDate;
    }
    return false;
  };

  // Construcción del universo de alumnos inscritos en esta materia
  const reporteResumen = useMemo<ReporteMateriaResumen>(() => {
    const normMat = norm(selectedMateria);

    // 1. Identificar alumnos relevantes:
    // a) Alumnos que tienen registro en esta materia
    // b) Alumnos cuyo grupo coincide con los grupos asignados a esta materia
    const targetAlumnosMap = new Map<string, Alumno>();

    alumnos.forEach((al) => {
      let belongs = false;

      // Coincidencia por grupo explícito seleccionado
      if (selectedGrupo && al.grupo === selectedGrupo) {
        belongs = true;
      } else if (!selectedGrupo) {
        // Pertenece si su grupo está en los grupos asignados a esta materia
        if (availableGrupos.includes(al.grupo)) {
          belongs = true;
        }
      }

      // O si ya tiene algún registro de asistencia/participación en esta materia
      const hasAtt = asistencias.some(
        (a) => (a.alumno_id === al.id || a.alumno_id === al.matricula) && a.materia && norm(a.materia) === normMat
      );
      const hasPart = participaciones.some(
        (p) => (p.alumno_id === al.id || p.alumno_id === al.matricula) && p.materia && norm(p.materia) === normMat
      );

      if (belongs || hasAtt || hasPart) {
        targetAlumnosMap.set(al.id, al);
      }
    });

    const studentList = Array.from(targetAlumnosMap.values()).sort((a, b) =>
      `${a.apellido_paterno} ${a.nombre}`.localeCompare(`${b.apellido_paterno} ${b.nombre}`)
    );

    // 2. Extraer registros históricos de toda la materia
    const allAttForMateria = asistencias.filter((a) => a.materia && norm(a.materia) === normMat);
    const allPartForMateria = participaciones.filter((p) => p.materia && norm(p.materia) === normMat);

    // 3. Extraer registros en la fecha o rango seleccionado
    const dateAttForMateria = allAttForMateria.filter((a) => isDateInFilter(a.fecha));
    const datePartForMateria = allPartForMateria.filter((p) => isDateInFilter(p.fecha));

    let presCount = 0;
    let retCount = 0;
    let falCount = 0;
    let justCount = 0;
    let sinRegCount = 0;
    let totalPartFecha = 0;
    let totalPtsFecha = 0;
    let countAP = 0;
    let countRegular = 0;
    let countRP = 0;

    const items: ReporteItemAlumno[] = studentList.map((st) => {
      // Registros en la fecha activa para este alumno
      const studentAttDate = dateAttForMateria.find(
        (a) => a.alumno_id === st.id || a.alumno_id === st.matricula || a.alumno?.matricula === st.matricula
      );

      const studentPartsDate = datePartForMateria.filter(
        (p) => p.alumno_id === st.id || p.alumno_id === st.matricula || p.alumno?.matricula === st.matricula
      );

      // Estado de asistencia en fecha
      let estadoAsist: 'A' | 'R' | 'F' | 'J' | 'SIN_REGISTRO' = 'SIN_REGISTRO';
      let asistLabel = 'Sin registro';

      if (studentAttDate && studentAttDate.estado) {
        estadoAsist = studentAttDate.estado;
        if (estadoAsist === 'A') {
          asistLabel = 'Presente';
          presCount++;
        } else if (estadoAsist === 'R') {
          asistLabel = 'Retardo';
          retCount++;
        } else if (estadoAsist === 'F') {
          asistLabel = 'Falta / Inasistencia';
          falCount++;
        } else if (estadoAsist === 'J') {
          asistLabel = 'Justificado';
          justCount++;
        }
      } else {
        sinRegCount++;
      }

      // Participaciones en fecha
      let partLabel = 'Ninguna';
      let tipoPart: 'AP' | 'REGULAR' | 'RP' | 'NINGUNA' = 'NINGUNA';
      let ptsDate = 0;

      const partDetails = studentPartsDate.map((p) => ({
        tipo: p.tipo,
        puntos: p.puntos,
        observaciones: p.observaciones
      }));

      if (studentPartsDate.length > 0) {
        totalPartFecha += studentPartsDate.length;
        ptsDate = studentPartsDate.reduce((acc, p) => acc + (p.puntos || 0), 0);
        totalPtsFecha += ptsDate;

        // Tomar la más alta o la última como principal
        const hasAP = studentPartsDate.some((p) => p.tipo === 'AP');
        const hasRP = studentPartsDate.some((p) => p.tipo === 'RP');

        if (hasAP) {
          tipoPart = 'AP';
          partLabel = `Excelente (+${ptsDate} pts)`;
          countAP++;
        } else if (hasRP) {
          tipoPart = 'RP';
          partLabel = `Por mejorar (+${ptsDate} pts)`;
          countRP++;
        } else {
          tipoPart = 'REGULAR';
          partLabel = `Buena (+${ptsDate} pts)`;
          countRegular++;
        }
      }

      // Métricas históricas completas del alumno en esta materia
      const histAtt = allAttForMateria.filter(
        (a) => a.alumno_id === st.id || a.alumno_id === st.matricula || a.alumno?.matricula === st.matricula
      );
      const histParts = allPartForMateria.filter(
        (p) => p.alumno_id === st.id || p.alumno_id === st.matricula || p.alumno?.matricula === st.matricula
      );

      const histA = histAtt.filter((a) => a.estado === 'A').length;
      const histR = histAtt.filter((a) => a.estado === 'R').length;
      const histF = histAtt.filter((a) => a.estado === 'F').length;
      const histJ = histAtt.filter((a) => a.estado === 'J').length;
      const totalHistSesiones = histAtt.length;
      const pctHist = totalHistSesiones > 0 ? ((histA + histR) / totalHistSesiones) * 100 : 100;
      const totalHistPts = histParts.reduce((acc, p) => acc + (p.puntos || 0), 0);

      const obsCombined = [
        studentAttDate?.observaciones,
        studentPartsDate.map((p) => p.observaciones).filter(Boolean).join('; ')
      ].filter(Boolean).join(' | ');

      return {
        alumnoId: st.id,
        matricula: st.matricula,
        nombreCompleto: `${st.nombre} ${st.apellido_paterno} ${st.apellido_materno || ''}`.trim(),
        grupo: st.grupo,
        carrera: st.carrera || 'Licenciatura Oficial UNRC',
        fotoUrl: st.foto_url,
        estadoAsistencia: estadoAsist,
        asistenciaLabel: asistLabel,
        horaRegistro: studentAttDate?.hora,
        tipoParticipacion: tipoPart,
        participacionLabel: partLabel,
        puntosFecha: ptsDate,
        participacionesDetalleFecha: partDetails,
        asistenciasMateriaTotal: histA,
        faltasMateriaTotal: histF,
        retardosMateriaTotal: histR,
        justificadosMateriaTotal: histJ,
        porcentajeAsistenciaMateria: pctHist,
        participacionesMateriaTotal: histParts.length,
        puntosMateriaTotal: totalHistPts,
        observaciones: obsCombined || undefined
      };
    });

    const evaluatedStudents = presCount + retCount + falCount + justCount;
    const pctGlobal = evaluatedStudents > 0 ? ((presCount + retCount) / evaluatedStudents) * 100 : 0;

    const displayFechaText =
      dateFilterMode === 'single'
        ? selectedDate
        : dateFilterMode === 'range'
        ? `${rangeStartDate} al ${rangeEndDate}`
        : 'Todas las fechas registradas';

    return {
      materia: selectedMateria || 'Asignatura UNRC',
      grupo: selectedGrupo || (availableGrupos.length === 1 ? availableGrupos[0] : 'Todos'),
      carrera: detectedDocente?.departamento || 'Licenciatura Oficial UNRC',
      docenteNombre: detectedDocente ? `${detectedDocente.nombre} ${detectedDocente.apellido_paterno}` : 'Dr. Adrian Silva',
      docenteNumEmpleado: detectedDocente?.num_empleado || 'DOC-UNRC',
      sedeNombre: detectedDocente?.sede_nombre || 'Campus Tijuana',
      ciclo: '2026-2',
      fecha: displayFechaText,
      esRango: dateFilterMode === 'range',
      fechaInicio: rangeStartDate,
      fechaFin: rangeEndDate,
      totalAlumnos: studentList.length,
      presentes: presCount,
      retardos: retCount,
      faltas: falCount,
      justificados: justCount,
      sinRegistro: sinRegCount,
      porcentajeAsistencia: pctGlobal,
      totalParticipacionesFecha: totalPartFecha,
      totalPuntosFecha: totalPtsFecha,
      participacionesAP: countAP,
      participacionesRegular: countRegular,
      participacionesRP: countRP,
      items
    };
  }, [
    selectedMateria,
    selectedGrupo,
    dateFilterMode,
    selectedDate,
    rangeStartDate,
    rangeEndDate,
    alumnos,
    asistencias,
    participaciones,
    availableGrupos,
    detectedDocente
  ]);

  // Alumnos filtrados por búsqueda y estado
  const filteredItems = useMemo(() => {
    return reporteResumen.items.filter((item) => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = norm(searchQuery);
        const matchName = norm(item.nombreCompleto).includes(q);
        const matchMat = norm(item.matricula).includes(q);
        const matchGrupo = norm(item.grupo).includes(q);
        const matchObs = item.observaciones && norm(item.observaciones).includes(q);
        if (!matchName && !matchMat && !matchGrupo && !matchObs) return false;
      }

      // Filtro por estado de asistencia o participación
      if (statusFilter === 'all') return true;
      if (statusFilter === 'A') return item.estadoAsistencia === 'A';
      if (statusFilter === 'R') return item.estadoAsistencia === 'R';
      if (statusFilter === 'F') return item.estadoAsistencia === 'F';
      if (statusFilter === 'J') return item.estadoAsistencia === 'J';
      if (statusFilter === 'con_participacion') return item.puntosFecha > 0;
      if (statusFilter === 'sin_participacion') return item.puntosFecha === 0;

      return true;
    });
  }, [reporteResumen.items, searchQuery, statusFilter]);

  // Cuadro de Honor: Alumnos con mayor puntuación de participación en esta fecha
  const topParticipantes = useMemo(() => {
    return reporteResumen.items
      .filter((it) => it.puntosFecha > 0)
      .sort((a, b) => b.puntosFecha - a.puntosFecha)
      .slice(0, 3);
  }, [reporteResumen.items]);

  // Alumnos ausentes (Faltas) que requieren atención
  const absentStudents = useMemo(() => {
    return reporteResumen.items.filter((it) => it.estadoAsistencia === 'F');
  }, [reporteResumen.items]);

  // Manejadores de exportación
  const handleExportExcel = () => {
    try {
      exportReporteToExcel(reporteResumen);
      setToastMessage('✅ Reporte descargado exitosamente en formato Excel (.xlsx)');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Error al exportar a Excel');
    }
  };

  const handleExportPDF = () => {
    try {
      exportReporteToPDF(reporteResumen);
      setToastMessage('📄 Reporte descargado exitosamente en formato PDF Institucional UNRC');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      exportReporteToCSV(reporteResumen);
      setToastMessage('📥 Reporte exportado a CSV');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-2xl shadow-emerald-950/40 border border-emerald-400 flex items-center space-x-2 animate-bounce">
          <BadgeCheck className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL: Título, Asignatura y Botones de Acción */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0C1B33] via-[#092238] to-[#1F0C24] border border-white/10 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#5B142F] to-[#7D1D41] border border-[#E8A938]/40 text-[#F5C253] text-[10px] font-black tracking-wider uppercase flex items-center space-x-1 shadow-md">
                <ShieldAlert className="w-3.5 h-3.5 text-[#F5C253]" />
                <span>UNRC • CONTROL ACADÉMICO</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                Ciclo {reporteResumen.ciclo}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <span>📊 Reporte Oficial de Asistencia y Participación</span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl">
              Control analítico por fecha y materia. Monitorea el porcentaje de asistencia diaria, evalúa participaciones académicas y descarga reportes en Excel y PDF con formato institucional de la Universidad.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto shrink-0 print:hidden">
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Refrescar datos en vivo"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 text-gray-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
              title="Imprimir reporte oficial"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
              title="Descargar en formato CSV"
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
              title="Descargar en formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Descargar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B142F] to-[#7D1D41] hover:from-[#6D1838] hover:to-[#8E224B] border border-[#E8A938] text-amber-200 hover:text-white text-xs font-black transition-all flex items-center space-x-2 shadow-xl shadow-[#5B142F]/40 cursor-pointer"
              title="Descargar PDF Oficial UNRC con firmas"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>PDF Oficial</span>
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS: MATERIA, GRUPO, MODO DE FECHA Y SELECTOR DE FECHAS */}
      <div className="p-5 rounded-3xl bg-[#090E1A]/90 border border-white/10 shadow-xl space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Selector de Materia */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Asignatura / Materia:</span>
            </label>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-white font-bold text-xs focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
            >
              {availableMaterias.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Grupo */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Grupo / Sección:</span>
            </label>
            <select
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-cyan-500/30 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            >
              <option value="">Todos los grupos asignados</option>
              {availableGrupos.map((g) => (
                <option key={g} value={g}>
                  Grupo {g}
                </option>
              ))}
            </select>
          </div>

          {/* Modo de Fecha: Día Único vs Rango de Fechas vs Todas */}
          <div className="md:col-span-5 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Modalidad de Consulta:</span>
              </label>

              {/* Botón de fecha actual rápida */}
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('single');
                  setSelectedDate(todayStr);
                }}
                className="text-[10px] text-amber-300 hover:underline font-bold"
              >
                📅 Ir a Hoy ({todayStr})
              </button>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setDateFilterMode('single')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  dateFilterMode === 'single'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md font-black'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                Sesión por Día
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('range')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  dateFilterMode === 'range'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md font-black'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                Rango de Fechas
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  dateFilterMode === 'all'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md font-black'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                Todo el Periodo
              </button>
            </div>
          </div>
        </div>

        {/* Inputs de Fecha Dinámicos según el modo */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {dateFilterMode === 'single' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-gray-400 font-bold text-xs flex items-center space-x-1.5">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span>Fecha a Evaluar:</span>
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-500/30 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-gray-400 font-medium">
                ({formatTijuanaDisplayDate(new Date(selectedDate + 'T12:00:00'))})
              </span>
            </div>
          ) : dateFilterMode === 'range' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400 font-bold text-xs">Desde:</span>
              <input
                type="date"
                value={rangeStartDate}
                onChange={(e) => setRangeStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-blue-500/30 text-white font-mono font-bold text-xs focus:outline-none focus:border-blue-400"
              />
              <span className="text-gray-400 font-bold text-xs">Hasta:</span>
              <input
                type="date"
                value={rangeEndDate}
                onChange={(e) => setRangeEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-blue-500/30 text-white font-mono font-bold text-xs focus:outline-none focus:border-blue-400"
              />
            </div>
          ) : (
            <div className="text-purple-300 font-bold text-xs flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Analizando el histórico completo de todas las sesiones registradas en el ciclo</span>
            </div>
          )}

          {/* Pastillas de Fechas con Registros de esta Materia */}
          {recordedDatesForMateria.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 max-w-full overflow-x-auto py-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold shrink-0">
                Fechas con clase ({recordedDatesForMateria.length}):
              </span>
              {recordedDatesForMateria.slice(0, 8).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDateFilterMode('single');
                    setSelectedDate(d);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    dateFilterMode === 'single' && selectedDate === d
                      ? 'bg-emerald-500 text-black font-black shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                  }`}
                  title={`Seleccionar fecha ${d}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* METRICAS CLAVE / KPIS EJECUTIVOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: Total Alumnos */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Total Alumnos</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{reporteResumen.totalAlumnos}</div>
          <div className="text-[10px] text-gray-400">
            {reporteResumen.grupo !== 'Todos' ? `Grupo ${reporteResumen.grupo}` : 'En esta materia'}
          </div>
        </div>

        {/* KPI 2: Tasa de Asistencia */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-black/40 border border-emerald-500/30 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Tasa Asistencia</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {reporteResumen.porcentajeAsistencia.toFixed(1)}%
          </div>
          <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, reporteResumen.porcentajeAsistencia)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Presentes vs Faltas */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Asistencia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-white flex items-center space-x-1.5">
            <span className="text-emerald-400">{reporteResumen.presentes}A</span>
            <span className="text-gray-500">•</span>
            <span className="text-amber-400">{reporteResumen.retardos}R</span>
            <span className="text-gray-500">•</span>
            <span className="text-rose-400">{reporteResumen.faltas}F</span>
          </div>
          <div className="text-[10px] text-gray-400">
            {reporteResumen.justificados > 0 ? `${reporteResumen.justificados} Justificados` : '0 justificados'}
          </div>
        </div>

        {/* KPI 4: Participaciones */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-black/40 border border-amber-500/30 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Participaciones</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">
            {reporteResumen.totalParticipacionesFecha}
          </div>
          <div className="text-[10px] text-amber-200/80 font-bold">
            +{reporteResumen.totalPuntosFecha} pts otorgados
          </div>
        </div>

        {/* KPI 5: Calidad de Participación (AP vs Regular vs RP) */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Desglose Pts</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xs font-bold text-gray-300 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-amber-300">🌟 AP (+10):</span>
              <span className="font-mono text-white">{reporteResumen.participacionesAP}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-300">🔹 Reg (+7.5):</span>
              <span className="font-mono text-white">{reporteResumen.participacionesRegular}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-300">🔸 RP (+5):</span>
              <span className="font-mono text-white">{reporteResumen.participacionesRP}</span>
            </div>
          </div>
        </div>

        {/* KPI 6: Docente Asignado */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Docente Titular</span>
            <GraduationCap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs font-extrabold text-white truncate" title={reporteResumen.docenteNombre}>
            {reporteResumen.docenteNombre}
          </div>
          <div className="text-[10px] text-gray-400 truncate">
            {reporteResumen.sedeNombre}
          </div>
        </div>

      </div>

      {/* SECCIÓN DE DESTACADOS: CUADRO DE HONOR Y ALUMNOS AUSENTES */}
      {(topParticipantes.length > 0 || absentStudents.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Cuadro de Honor: Alumnos con mayor participación */}
          {topParticipantes.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-black/40 border border-amber-500/20 space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-400" />
                <span>🏆 Cuadro de Honor de la Sesión ({reporteResumen.fecha})</span>
              </div>

              <div className="space-y-2">
                {topParticipantes.map((top, idx) => (
                  <div
                    key={top.alumnoId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-amber-500/10 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : 'bg-amber-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white">{top.nombreCompleto}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{top.matricula} • Grupo {top.grupo}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black text-xs">
                        +{top.puntosFecha} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumnos en Riesgo por Falta */}
          {absentStudents.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 to-black/40 border border-rose-500/20 space-y-3">
              <div className="flex items-center space-x-2 text-rose-300 text-xs font-black uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>⚠️ Alumnos con Falta Registrada ({absentStudents.length})</span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {absentStudents.map((abs) => (
                  <div
                    key={abs.alumnoId}
                    className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-rose-500/10 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{abs.nombreCompleto}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{abs.matricula} • Grupo {abs.grupo}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-[10px]">
                      Inasistencia
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* CONTROLES DE LA TABLA: BÚSQUEDA Y FILTROS POR ESTADO */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs print:hidden">
        
        {/* Input de Búsqueda */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, matrícula o nota..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Filtros rápidos por estado */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] text-gray-400 font-bold shrink-0">Filtrar:</span>
          
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-black/30 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            Todos ({reporteResumen.items.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('A')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              statusFilter === 'A'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-black/30 text-emerald-400/80 border-emerald-500/20 hover:text-emerald-300'
            }`}
          >
            Presentes ({reporteResumen.presentes})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('F')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              statusFilter === 'F'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-black/30 text-rose-400/80 border-rose-500/20 hover:text-rose-300'
            }`}
          >
            Faltas ({reporteResumen.faltas})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('con_participacion')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              statusFilter === 'con_participacion'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-black/30 text-amber-400/80 border-amber-500/20 hover:text-amber-300'
            }`}
          >
            Con Participación ({reporteResumen.totalParticipacionesFecha})
          </button>
        </div>

      </div>

      {/* TABLA DETALLADA DE ASISTENCIA Y PARTICIPACIÓN */}
      <div className="bg-[#090E1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#0C1B33] to-[#121E38] text-gray-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-white/10">
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Matrícula</th>
                <th className="px-4 py-3.5">Estudiante</th>
                <th className="px-4 py-3.5 text-center">Grupo</th>
                <th className="px-4 py-3.5 text-center">Asistencia ({reporteResumen.fecha})</th>
                <th className="px-4 py-3.5 text-center">Participación en Clase</th>
                <th className="px-4 py-3.5 text-center">Pts Sesión</th>
                <th className="px-4 py-3.5 text-center">Histórico Materia</th>
                <th className="px-4 py-3.5">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 space-y-2">
                    <Users className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="font-bold">No se encontraron estudiantes para los filtros seleccionados.</p>
                    <p className="text-[11px] text-gray-500">Prueba cambiando la fecha o seleccionando otro grupo de la materia.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isPresent = item.estadoAsistencia === 'A';
                  const isLate = item.estadoAsistencia === 'R';
                  const isAbsent = item.estadoAsistencia === 'F';
                  const isExcused = item.estadoAsistencia === 'J';
                  const hasPart = item.puntosFecha > 0;

                  return (
                    <tr
                      key={item.alumnoId}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isAbsent ? 'bg-rose-500/[0.02]' : hasPart ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      {/* # Index */}
                      <td className="px-4 py-3 text-center text-gray-500 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Matrícula */}
                      <td className="px-4 py-3 font-mono font-bold text-amber-300 text-xs">
                        {item.matricula}
                      </td>

                      {/* Nombre y Avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2.5">
                          {item.fotoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.fotoUrl}
                              alt={item.nombreCompleto}
                              className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5B142F] to-[#7D1D41] border border-amber-500/30 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                              {item.nombreCompleto.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-xs">{item.nombreCompleto}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{item.carrera}</div>
                          </div>
                        </div>
                      </td>

                      {/* Grupo */}
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-gray-300 font-bold">
                          {item.grupo}
                        </span>
                      </td>

                      {/* Asistencia del Día */}
                      <td className="px-4 py-3 text-center">
                        {isPresent && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Presente (A)</span>
                          </span>
                        )}
                        {isLate && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-[11px]">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Retardo (R)</span>
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-black text-[11px]">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Inasistencia (F)</span>
                          </span>
                        )}
                        {isExcused && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-black text-[11px]">
                            <AlertCircle className="w-3 h-3 text-sky-400" />
                            <span>Justificado (J)</span>
                          </span>
                        )}
                        {!isPresent && !isLate && !isAbsent && !isExcused && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-[10px]">
                            <span>⚪ Sin pase</span>
                          </span>
                        )}

                        {item.horaRegistro && (
                          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                            {item.horaRegistro} hrs
                          </div>
                        )}
                      </td>

                      {/* Participación del Día */}
                      <td className="px-4 py-3 text-center">
                        {item.tipoParticipacion === 'AP' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-[11px]">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>Excelente (AP)</span>
                          </span>
                        ) : item.tipoParticipacion === 'REGULAR' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-black text-[11px]">
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            <span>Buena (Reg)</span>
                          </span>
                        ) : item.tipoParticipacion === 'RP' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 font-black text-[11px]">
                            <AlertCircle className="w-3 h-3 text-orange-400" />
                            <span>Por mejorar (RP)</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Puntos Sesión */}
                      <td className="px-4 py-3 text-center font-mono font-black text-xs">
                        {item.puntosFecha > 0 ? (
                          <span className="text-amber-300">+{item.puntosFecha} pts</span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>

                      {/* Histórico en la Materia */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center space-y-0.5">
                          <span className="text-xs font-bold text-gray-300">
                            {item.asistenciasMateriaTotal}A • {item.faltasMateriaTotal}F ({item.porcentajeAsistenciaMateria.toFixed(0)}%)
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {item.participacionesMateriaTotal} part. ({item.puntosMateriaTotal} pts)
                          </span>
                        </div>
                      </td>

                      {/* Observaciones */}
                      <td className="px-4 py-3 text-gray-400 text-xs italic max-w-xs truncate" title={item.observaciones}>
                        {item.observaciones || <span className="text-gray-600 not-italic">-</span>}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con Resumen Final */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div>
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{reporteResumen.items.length}</strong> alumnos evaluados en <strong>{reporteResumen.materia}</strong>.
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Tasa del día: <strong className="text-emerald-400">{reporteResumen.porcentajeAsistencia.toFixed(1)}%</strong></span>
            <span>•</span>
            <span>Participaciones: <strong className="text-amber-400">{reporteResumen.totalParticipacionesFecha}</strong></span>
            <span>•</span>
            <span>Puntos: <strong className="text-amber-300">+{reporteResumen.totalPuntosFecha} pts</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
}
