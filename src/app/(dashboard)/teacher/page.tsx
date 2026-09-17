"use client";

import React, { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, Docente, HorarioDocenteItem } from '@/lib/db';
import {
  generateDocenteHorarioPDF,
  downloadDocenteICS,
  createGoogleCalendarUrl
} from '@/lib/horarioDocenteUtils';

export default function TeacherDashboardPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('c-tur-201');
  const [currentDocente, setCurrentDocente] = useState<Docente | null>(null);
  const [calendarBannerDismissed, setCalendarBannerDismissed] = useState(false);

  // Strict Authentication Guard
  useEffect(() => {
    if (!authLoading && (!user || (role !== 'docente' && role !== 'administrador'))) {
      window.location.href = '/login?error=teacher_required';
    }
  }, [user, role, authLoading]);

  // Load Docente's official profile and schedules from database
  useEffect(() => {
    async function loadDocenteProfile() {
      try {
        const allDocs = await db.getDocentes();
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

  // Turismo Group 201-TUR Demo Students
  const turismoStudents: StudentItem[] = [
    { id: 'al-1', name: 'Dayanna Gissel Buitimea Garma', student_code: 'UNRC-2026-005' },
    { id: 'al-2', name: 'Astrid Cristina Diaz Moreno', student_code: 'UNRC-2026-006' },
    { id: 'al-3', name: 'Julibeth Hernandez Herrera', student_code: 'UNRC-2026-007' },
    { id: 'al-4', name: 'Blanca Estela Lopez Pablo', student_code: 'UNRC-2026-008' },
    { id: 'al-5', name: 'Cecilia Todd Ambriz', student_code: 'UNRC-2026-009' },
    { id: 'al-6', name: 'Alejandra Garcia Hernandez', student_code: 'UNRC-2026-010' },
  ];

  // Administración Group 203-ADM Demo Students
  const admStudents: StudentItem[] = [
    { id: 'al-19', name: 'Gabriela Erandi Capilla Manuel', student_code: 'UNRC-2026-023' },
    { id: 'al-20', name: 'Angélica Altamirano Solórzano', student_code: 'UNRC-2026-024' },
    { id: 'al-21', name: 'Magali Arce Garcia', student_code: 'UNRC-2026-025' },
    { id: 'al-22', name: 'Michell Evelin Cruz Alcantara', student_code: 'UNRC-2026-026' },
  ];

  const activeStudents = selectedCourseId === 'c-tur-201' ? turismoStudents : admStudents;
  const activeCourseName = selectedCourseId === 'c-tur-201'
    ? 'Lic. en Turismo - Administración de Empresas de Hospedaje (Grupo 201-TUR)'
    : 'Lic. en Administración - Matemáticas para la Administración (Grupo 203-ADM)';
  
  const activeSchedule = selectedCourseId === 'c-tur-201'
    ? 'Miércoles (09:00 - 11:00 hrs) y Sábados (07:00 - 09:00 hrs)'
    : 'Lunes a Sábado (07:00 - 13:00 hrs)';

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

          {/* Course Selector Dropdown */}
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 space-y-1 w-full sm:w-auto">
            <label className="text-[10px] uppercase font-bold text-gray-400 block">Seleccionar Curso Asignado:</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="c-tur-201">Grupo 201-TUR (Turismo - Hospedaje)</option>
              <option value="c-adm-203">Grupo 203-ADM (Administración - Mates)</option>
            </select>
          </div>
        </div>

        {/* Attendance Sheet Component */}
        <AttendanceSheet
          courseId={selectedCourseId}
          courseName={activeCourseName}
          scheduleDescription={activeSchedule}
          students={activeStudents}
        />
      </div>

    </div>
  );
}
