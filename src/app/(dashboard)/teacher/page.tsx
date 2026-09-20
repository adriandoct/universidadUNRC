"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AttendanceSheet, { StudentItem } from '../../../components/AttendanceSheet';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Sparkles,
  Award,
  Globe,
  Building,
  FileText,
  Clock,
  MapPin,
  ExternalLink,
  Download,
  Users,
  Layers
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, Docente, HorarioDocenteItem, Alumno, Grupo } from '@/lib/db';
import {
  generateDocenteHorarioPDF,
  downloadDocenteICS,
  createGoogleCalendarUrl
} from '@/lib/horarioDocenteUtils';

export interface AssignedCourseItem {
  id: string;
  grupo: string;
  materia: string;
  carrera: string;
  aula?: string;
  dias: string[];
  scheduleDescription: string;
  modalidad: 'Presencial' | 'En Línea' | 'Mixta';
  sesionesCount: number;
}

export default function TeacherDashboardPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [currentDocente, setCurrentDocente] = useState<Docente | null>(null);
  const [allAlumnos, setAllAlumnos] = useState<Alumno[]>([]);
  const [allGrupos, setAllGrupos] = useState<Grupo[]>([]);
  const [calendarBannerDismissed, setCalendarBannerDismissed] = useState(false);

  // Strict Authentication Guard
  useEffect(() => {
    if (!authLoading && (!user || (role !== 'docente' && role !== 'administrador'))) {
      window.location.href = '/login?error=teacher_required';
    }
  }, [user, role, authLoading]);

  // Load Docente's official profile, alumnos, and schedules from database
  useEffect(() => {
    async function loadDocenteProfile() {
      try {
        const [allDocs, alumnosList, gruposList] = await Promise.all([
          db.getDocentes(),
          db.getAlumnos(),
          db.getGrupos()
        ]);
        setAllAlumnos(alumnosList || []);
        setAllGrupos(gruposList || []);

        const found =
          allDocs.find(
            (d) =>
              d.id === user?.id ||
              d.num_empleado === user?.id ||
              d.num_empleado === (user as any)?.num_empleado ||
              (user?.email && d.email && user.email.toLowerCase() === d.email.toLowerCase()) ||
              (user?.nombre && `${d.nombre} ${d.apellido_paterno}`.toLowerCase().includes(user.nombre.toLowerCase()))
          ) ||
          allDocs.find((d) => d.num_empleado === 'DOC-UNRC-03') || // Dr. Adrian Silva default mock
          allDocs[0];

        setCurrentDocente(found || null);
      } catch (err) {
        console.error('Error loading docente profile:', err);
      }
    }
    loadDocenteProfile();
  }, [user]);



  // Helper to canonicalize group codes so PHLAC-203-TIJ and 203-ADM merge cleanly
  const getCanonicalGroup = (rawGrupo?: string, materiaOrCarrera: string = ''): string => {
    const g = (rawGrupo || '').trim();
    const clean = g.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mat = (materiaOrCarrera || '').toLowerCase();

    if (clean.includes('203') || clean.includes('phlac') || mat.includes('matemáticas') || mat.includes('administración')) {
      if (!mat.includes('turismo') && !mat.includes('hospedaje')) {
        return '203-ADM';
      }
    }
    if (clean.includes('201') || clean.includes('tur') || mat.includes('hospedaje') || mat.includes('turismo')) {
      if (!clean.includes('tic') && !clean.includes('lcdn')) {
        return '201-TUR';
      }
    }
    if (clean.includes('401') || mat.includes('predictivo') || clean.includes('lcdn')) {
      return '401-LCDN';
    }
    return g || 'Sin grupo';
  };

  // Extract ALL Assigned Courses dynamically for this Docente STRICTLY from active schedule (horarios)
  const assignedCourses: AssignedCourseItem[] = useMemo(() => {
    if (!currentDocente || !currentDocente.horarios || currentDocente.horarios.length === 0) {
      return [];
    }

    const courseMap = new Map<string, {
      id: string;
      grupo: string;
      materia: string;
      carrera: string;
      aulas: Set<string>;
      sesiones: { dia: string; inicio: string; fin: string; online: boolean }[];
    }>();

    // Process docente's schedules - EXCLUSIVELY based on currentDocente.horarios
    currentDocente.horarios.forEach((h) => {
      const rawGrupo = (h.grupo || 'Sin grupo').trim();
      const materia = (h.materia || 'Materia sin asignar').trim();
      if (!materia) return;

      const canonicalGrupo = getCanonicalGroup(rawGrupo, materia);
      const carrera = (h.carrera || currentDocente.departamento || 'Licenciatura').trim();
      const key = `${canonicalGrupo}____${materia}`.toLowerCase();

      if (!courseMap.has(key)) {
        const courseId = `course-${canonicalGrupo.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${materia.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25)}`;
        courseMap.set(key, {
          id: courseId,
          grupo: canonicalGrupo,
          materia,
          carrera,
          aulas: new Set(h.aula ? [h.aula] : []),
          sesiones: h.dia ? [{ dia: h.dia, inicio: h.hora_inicio, fin: h.hora_fin, online: Boolean(h.es_en_linea) }] : []
        });
      } else {
        const existing = courseMap.get(key)!;
        if (h.aula) existing.aulas.add(h.aula);
        if (h.dia) {
          const isDuplicate = existing.sesiones.some(
            (s) => s.dia === h.dia && s.inicio === h.hora_inicio && s.fin === h.hora_fin
          );
          if (!isDuplicate) {
            existing.sesiones.push({
              dia: h.dia,
              inicio: h.hora_inicio,
              fin: h.hora_fin,
              online: Boolean(h.es_en_linea)
            });
          }
        }
      }
    });

    // Fallback default courses only if schedule is completely empty
    if (courseMap.size === 0) {
      return [
        {
          id: 'c-tur-201',
          grupo: '201-TUR',
          materia: 'Administración de Empresas de Hospedaje',
          carrera: 'Licenciatura en Turismo',
          aula: 'Campus Tijuana - Aula Magna TIJ',
          dias: ['Miércoles', 'Sábado'],
          scheduleDescription: 'Miércoles (09:00 - 11:00 hrs) y Sábados (07:00 - 09:00 hrs)',
          modalidad: 'Mixta',
          sesionesCount: 2
        },
        {
          id: 'c-adm-203',
          grupo: '203-ADM',
          materia: 'Matemáticas para la Administración',
          carrera: 'Licenciatura en Administración',
          aula: 'Campus Tijuana - Aula 203',
          dias: ['Lunes'],
          scheduleDescription: 'Lunes (07:00 - 09:00 hrs)',
          modalidad: 'Presencial',
          sesionesCount: 1
        }
      ];
    }

    // Convert map to array with nice formatted schedule string and modality
    const dayOrder: Record<string, number> = {
      'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7
    };

    return Array.from(courseMap.values()).map((entry) => {
      const hasOnline = entry.sesiones.some((s) => s.online);
      const hasPresencial = entry.sesiones.some((s) => !s.online);
      const modalidad: 'Presencial' | 'En Línea' | 'Mixta' =
        hasOnline && hasPresencial ? 'Mixta' : hasOnline ? 'En Línea' : 'Presencial';

      const sortedSesiones = [...entry.sesiones].sort(
        (a, b) => (dayOrder[a.dia] || 99) - (dayOrder[b.dia] || 99)
      );

      const scheduleDescription = sortedSesiones.length > 0
        ? sortedSesiones.map((s) => `${s.dia} (${s.inicio} - ${s.fin} hrs${s.online ? ' • En Línea' : ''})`).join(', ')
        : 'Horario semestral programado';

      return {
        id: entry.id,
        grupo: entry.grupo,
        materia: entry.materia,
        carrera: entry.carrera,
        aula: Array.from(entry.aulas).join(', ') || undefined,
        dias: Array.from(new Set(sortedSesiones.map((s) => s.dia))),
        scheduleDescription,
        modalidad,
        sesionesCount: sortedSesiones.length
      };
    });
  }, [currentDocente]);

  // Keep selected course ID valid
  useEffect(() => {
    if (assignedCourses.length > 0) {
      const exists = assignedCourses.some((c) => c.id === selectedCourseId);
      if (!exists) {
        setSelectedCourseId(assignedCourses[0].id);
      }
    }
  }, [assignedCourses, selectedCourseId]);

  const selectedCourse = useMemo(() => {
    return assignedCourses.find((c) => c.id === selectedCourseId) || assignedCourses[0];
  }, [assignedCourses, selectedCourseId]);

  // Dynamically resolve students enrolled in the selected course's group
  const activeStudents: StudentItem[] = useMemo(() => {
    if (!selectedCourse) return [];

    const courseGrupo = (selectedCourse.grupo || '').trim().toLowerCase();
    const courseGroupClean = courseGrupo.replace(/[^a-z0-9]/g, '');
    const courseMateria = (selectedCourse.materia || '').trim().toLowerCase();
    const courseCarrera = (selectedCourse.carrera || '').trim().toLowerCase();

    // Extract numbers from course group (e.g. 203 from PHLAC-203-TIJ or 203-ADM)
    const courseGroupNum = courseGrupo.match(/\b([1-9][0-9]{2})\b/)?.[1] ||
      (courseGroupClean.includes('203') ? '203' :
       courseGroupClean.includes('201') ? '201' :
       courseGroupClean.includes('301') ? '301' :
       courseGroupClean.includes('401') ? '401' :
       courseGroupClean.includes('501') ? '501' :
       courseGroupClean.includes('101') ? '101' : '');

    const isCourseTurismo = courseCarrera.includes('turis') || courseMateria.includes('hospedaje') || courseGroupClean.includes('tur');
    const isCourseAdm = courseCarrera.includes('admin') || courseGroupClean.includes('adm') || courseGroupClean.includes('phlac') || courseMateria.includes('matemáticas');
    const isCourseDatos = courseCarrera.includes('dato') || courseCarrera.includes('cdia') || courseCarrera.includes('lcdn') || courseGroupClean.includes('lcdn');

    // Filter matching students from database
    const matched = allAlumnos.filter((al) => {
      // Exclude fake/mock matriculas
      if (al.matricula && al.matricula.startsWith('UNRC-2026-')) return false;

      const alGrupo = (al.grupo || '').trim().toLowerCase();
      const alGroupClean = alGrupo.replace(/[^a-z0-9]/g, '');
      const alCarrera = (al.carrera || '').trim().toLowerCase();

      // Student group number (e.g. 203, 201, 301, 401)
      const alGroupNum = alGrupo.match(/\b([1-9][0-9]{2})\b/)?.[1] ||
        (alGroupClean.includes('203') ? '203' :
         alGroupClean.includes('201') ? '201' :
         alGroupClean.includes('301') ? '301' :
         alGroupClean.includes('401') ? '401' :
         alGroupClean.includes('501') ? '501' :
         alGroupClean.includes('101') ? '101' : '');

      const isAlTurismo = alCarrera.includes('turis') || alGroupClean.includes('tur');
      const isAlAdm = alCarrera.includes('admin') || alGroupClean.includes('adm') || alGroupClean.includes('phlac');
      const isAlDatos = alCarrera.includes('dato') || alGroupClean.includes('lcdn');

      // 1. Exact or sanitized group match
      if (alGroupClean && (alGroupClean === courseGroupClean || alGrupo === courseGrupo)) {
        return true;
      }

      // 2. Administración 203 group match (PHLAC-203-TIJ <=> 203-ADM)
      if (isCourseAdm && isAlAdm && courseGroupNum === '203' && alGroupNum === '203') {
        return true;
      }

      // 3. Turismo 201 group match (PHLTUR-201-TIJ <=> 201-TUR)
      if (isCourseTurismo && isAlTurismo && courseGroupNum === '201' && alGroupNum === '201') {
        return true;
      }

      // 4. Datos 401 group match (PHLCDN-401-TIJ <=> 401-LCDN)
      if (isCourseDatos && isAlDatos && courseGroupNum === '401' && alGroupNum === '401') {
        return true;
      }

      // 5. Match by same group number AND same career
      if (courseGroupNum && alGroupNum && courseGroupNum === alGroupNum) {
        if (isCourseAdm && isAlAdm) return true;
        if (isCourseTurismo && isAlTurismo) return true;
        if (isCourseDatos && isAlDatos) return true;
      }

      return false;
    });

    return matched.map((al) => ({
      id: al.id || al.matricula,
      name: `${al.nombre} ${al.apellido_paterno} ${al.apellido_materno || ''}`.trim(),
      student_code: al.matricula,
      notes: `${al.grado || ''} • ${al.carrera || selectedCourse.carrera}`.trim()
    }));
  }, [selectedCourse, allAlumnos]);

  const activeCourseName = selectedCourse
    ? `${selectedCourse.materia} (Grupo ${selectedCourse.grupo} • ${selectedCourse.carrera})`
    : 'Curso UNRC';

  const activeSchedule = selectedCourse?.scheduleDescription || 'Lunes a Sábado';

  const horarios = currentDocente?.horarios || [];
  const presencialesCount = horarios.filter((h) => !h.es_en_linea).length;
  const onlineCount = horarios.filter((h) => Boolean(h.es_en_linea)).length;

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#08152B] to-[#0A382B] p-6 sm:p-8 border border-blue-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                Consola Docente • {currentDocente ? `${currentDocente.nombre} ${currentDocente.apellido_paterno}` : user?.nombre || 'Docente Titular'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Portal del Docente & Horario Oficial
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm max-w-2xl">
              Consulta tu horario oficial diferenciado por modalidad (<strong className="text-emerald-300 font-semibold">Presencial</strong> y <strong className="text-cyan-300 font-semibold">En Línea</strong>), descárgalo en PDF y sincronízalo con tu Google Calendar.
            </p>
          </div>

          {/* Quick PDF & Calendar Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {currentDocente && (
              <>
                <button
                  type="button"
                  onClick={() => generateDocenteHorarioPDF(currentDocente)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2"
                  title="Descargar mi horario oficial en formato PDF"
                >
                  <FileText className="w-4 h-4 text-blue-200" />
                  <span>Descargar Horario PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadDocenteICS(currentDocente)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
                  title="Sincronizar mi horario completo con Google Calendar (.ics)"
                >
                  <Calendar className="w-4 h-4 text-emerald-200" />
                  <span>Sincronizar Google Calendar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN DEDICADA: MI HORARIO OFICIAL SEMANAL Y RECORDATORIO GOOGLE CALENDAR */}
      <div className="bg-[#0B132B]/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Mi Horario de Clases Semanal</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Carga horaria asignada para el Ciclo 2026-2 • Sede: {currentDocente?.sede_nombre || 'Campus Tijuana'}
            </p>
          </div>

          {/* Badges Resumen */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>{presencialesCount} Sesiones Presenciales</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{onlineCount} Sesiones En Línea</span>
            </span>
          </div>
        </div>

        {/* Notificación de Google Calendar y Correo */}
        {!calendarBannerDismissed && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-white block">
                  🔔 Recordatorios de Google Calendar sincronizados con tu correo ({currentDocente?.email || user?.email || 'institucional'})
                </span>
                <span className="text-gray-300 block text-[11px]">
                  Al agregar tus clases a Google Calendar recibirás alertas 30 minutos antes para recordar si tu sesión es <strong>Presencial en Campus</strong> o <strong>En Línea por Google Meet</strong>.
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {currentDocente && (
                <button
                  type="button"
                  onClick={() => downloadDocenteICS(currentDocente)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-[11px] transition-all flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Descargar .ICS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCalendarBannerDismissed(true)}
                className="text-gray-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Lista / Grid de Bloques de Horarios */}
        {horarios.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <Clock className="w-8 h-8 text-gray-500 mx-auto" />
            <p className="text-sm text-gray-400">No hay bloques de horario registrados todavía.</p>
            <p className="text-xs text-gray-500">Contacta a la Coordinación Académica para la programación de tus cursos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {horarios.map((h, idx) => {
              const isOnline = Boolean(h.es_en_linea);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                    isOnline
                      ? 'bg-gradient-to-b from-[#082032]/60 to-[#0B132B]/80 border-cyan-500/30 hover:border-cyan-500/60 shadow-lg shadow-cyan-950/20'
                      : 'bg-gradient-to-b from-[#09221C]/60 to-[#0B132B]/80 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header: Día y Badge de Modalidad */}
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-sm flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{h.dia}</span>
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isOnline
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {isOnline ? '🌐 EN LÍNEA' : '🏛️ PRESENCIAL'}
                      </span>
                    </div>

                    {/* Horas */}
                    <div className="font-mono text-base font-bold text-amber-400 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 max-w-fit">
                      {h.hora_inicio} - {h.hora_fin} hrs
                    </div>

                    {/* Materia y Grupo */}
                    <div className="space-y-1 pt-1">
                      <h3 className="font-bold text-white text-xs leading-snug">{h.materia}</h3>
                      <div className="text-[11px] text-gray-400 flex items-center space-x-2">
                        <span>Grupo: <strong className="text-gray-200">{h.grupo}</strong></span>
                        <span>•</span>
                        <span className="truncate">{h.carrera || currentDocente?.departamento}</span>
                      </div>
                    </div>

                    {/* Aula o Enlace Virtual */}
                    <div className={`p-2 rounded-xl text-xs flex items-center space-x-2 ${
                      isOnline ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-500/20' : 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/20'
                    }`}>
                      {isOnline ? (
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="truncate font-medium text-[11px]">
                        {h.aula || (isOnline ? 'Aula Virtual (Google Meet)' : 'Aula en Campus')}
                      </span>
                    </div>
                  </div>

                  {/* Botón directo a Google Calendar para este bloque */}
                  {currentDocente && (
                    <a
                      href={createGoogleCalendarUrl(h, currentDocente)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Agregar a Google Calendar</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 ml-0.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN: TOMADOR DE ASISTENCIA Y GESTIÓN DE CURSO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Tomador de Asistencia y Participaciones</h2>
            <p className="text-xs text-gray-400">
              Registra la asistencia diaria (A/R/J) y las participaciones de tus alumnos para cada sesión programada.
            </p>
          </div>

          {/* Course Selector Dropdown - Dynamic for ALL assigned courses */}
          <div className="bg-black/50 p-3.5 rounded-2xl border border-blue-500/20 shadow-xl space-y-2 w-full sm:w-auto min-w-[340px] max-w-full">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Cursos Asignados ({assignedCourses.length}):</span>
              </label>
              {selectedCourse && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>{activeStudents.length} Alumnos</span>
                </span>
              )}
            </div>

            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#090E1A] border border-blue-500/30 text-white text-xs font-bold focus:outline-none focus:border-blue-400 transition-colors shadow-inner"
            >
              {assignedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  Grupo {c.grupo} • {c.materia} ({c.modalidad})
                </option>
              ))}
            </select>

            {selectedCourse && (
              <div className="text-[11px] text-gray-400 pt-0.5 flex flex-col space-y-0.5">
                <div className="flex items-center space-x-1.5 text-gray-300">
                  <span className="font-semibold">{selectedCourse.carrera}</span>
                  {selectedCourse.aula && (
                    <>
                      <span>•</span>
                      <span className="text-gray-400">{selectedCourse.aula}</span>
                    </>
                  )}
                </div>
                <div className="text-amber-400/90 font-mono text-[10px]">
                  {selectedCourse.scheduleDescription}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Sheet Component */}
        <AttendanceSheet
          key={selectedCourseId}
          courseId={selectedCourseId}
          courseName={activeCourseName}
          scheduleDescription={activeSchedule}
          students={activeStudents}
        />
      </div>

    </div>
  );
}
