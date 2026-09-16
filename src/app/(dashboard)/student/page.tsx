"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { db, Alumno, Grupo, Docente, Asistencia, HorarioDocenteItem } from '@/lib/db';
import { DIAS_FESTIVOS_UNRC, DiaFestivo, getProximoDiaFestivo } from '@/lib/holidays';
import { 
  User, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  QrCode, 
  BookOpen, 
  MapPin, 
  AlertCircle, 
  Check, 
  FileText,
  CalendarDays,
  Sun,
  GraduationCap,
  Info,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface HorarioItemDisplay {
  id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  materia: string;
  docente_nombre: string;
  aula: string;
  sede: string;
  grupo: string;
  es_en_linea?: boolean;
}

// Helper functions for matching student schedule with assigned docentes by grupo, carrera, sede
function normalizeDay(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isGroupMatch(slotGrupo?: string, studentGrupo?: string): boolean {
  if (!slotGrupo || !studentGrupo) return false;
  const sg = slotGrupo.trim().toLowerCase();
  const stg = studentGrupo.trim().toLowerCase();
  if (sg === stg) return true;
  
  // Strip hyphens, spaces, underscores
  const cleanSg = sg.replace(/[\s-_]/g, '');
  const cleanStg = stg.replace(/[\s-_]/g, '');
  if (cleanSg === cleanStg) return true;

  // Compare numeric group code (e.g. 401 in 401-LCDN and 401, 201 in 201-TUR and 201)
  const sgDigits = sg.match(/\d+/)?.[0];
  const stgDigits = stg.match(/\d+/)?.[0];
  if (sgDigits && stgDigits && sgDigits === stgDigits) {
    return true;
  }

  return cleanSg.includes(cleanStg) || cleanStg.includes(cleanSg);
}

function isCarreraMatch(slotCarrera?: string, studentCarrera?: string, teacherCarreras?: string[]): boolean {
  const checkSingle = (c1?: string, c2?: string): boolean => {
    if (!c1 || !c2) return false;
    const a = c1.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const b = c2.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;

    // Data Science / AI aliases
    const isA_Data = a.includes('dato') || a.includes('data') || a.includes('lcdn') || a.includes('cdia') || a.includes('inteligencia artificial') || a.includes('ia') || a.includes('negocio');
    const isB_Data = b.includes('dato') || b.includes('data') || b.includes('lcdn') || b.includes('cdia') || b.includes('inteligencia artificial') || b.includes('ia') || b.includes('negocio');
    if (isA_Data && isB_Data) return true;

    // Turismo aliases
    const isA_Tur = a.includes('turis') || /\b(tur|lic-tur)\b/i.test(a) || a.includes('hospedaje');
    const isB_Tur = b.includes('turis') || /\b(tur|lic-tur)\b/i.test(b) || b.includes('hospedaje');
    if (isA_Tur && isB_Tur) return true;

    // Administración aliases
    const isA_Adm = a.includes('administra') || a.includes('admin') || /\b(adm|lic-adm|la)\b/i.test(a);
    const isB_Adm = b.includes('administra') || b.includes('admin') || /\b(adm|lic-adm|la)\b/i.test(b);
    if (isA_Adm && isB_Adm) return true;

    // TIC aliases
    const isA_Tic = a.includes('tic') || a.includes('tecnolog') || a.includes('comput');
    const isB_Tic = b.includes('tic') || b.includes('tecnolog') || b.includes('comput');
    if (isA_Tic && isB_Tic) return true;

    // Ciberseguridad aliases
    const isA_Cib = a.includes('ciber') || a.includes('seguridad') || a.includes('cib');
    const isB_Cib = b.includes('ciber') || b.includes('seguridad') || b.includes('cib');
    if (isA_Cib && isB_Cib) return true;

    return false;
  };

  if (checkSingle(slotCarrera, studentCarrera)) return true;
  if (teacherCarreras && teacherCarreras.some(tc => checkSingle(tc, studentCarrera))) return true;
  return false;
}

function isSedeMatch(slotAula?: string, slotSede?: string, teacherSede?: string, studentSede?: string, isOnline?: boolean): boolean {
  if (isOnline) return true;
  if (slotAula && (slotAula.toLowerCase().includes('virtual') || slotAula.toLowerCase().includes('meet') || slotAula.toLowerCase().includes('linea') || slotAula.toLowerCase().includes('línea'))) {
    return true;
  }
  const check = (s1?: string, s2?: string) => {
    if (!s1 || !s2) return true;
    const a = s1.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const b = s2.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (a === b || a.includes(b) || b.includes(a)) return true;
    if (a.includes('tijuana') && b.includes('tijuana')) return true;
    if (a.includes('magdalena') && b.includes('magdalena')) return true;
    if (a.includes('justo') && b.includes('justo')) return true;
    if (a.includes('coyoacan') && b.includes('coyoacan')) return true;
    return false;
  };

  if (slotSede && check(slotSede, studentSede)) return true;
  if (teacherSede && check(teacherSede, studentSede)) return true;
  return true;
}

export default function StudentDashboardPage() {
  const { user, role, isLoading: authLoading, logout } = useAuth();
  const [student, setStudent] = useState<Alumno | null>(null);
  const [assignedSchedules, setAssignedSchedules] = useState<HorarioItemDisplay[]>([]);
  const [attendances, setAttendances] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'horarios' | 'asistencias' | 'festivos' | 'credencial'>('horarios');
  const [dayFilter, setDayFilter] = useState<string>('todos');
  const [holidayFilter, setHolidayFilter] = useState<'todos' | 'suspension' | 'conmemorativo'>('todos');

  // Strict Authentication Guard
  useEffect(() => {
    if (!authLoading && (!user || (role !== 'alumno' && role !== 'administrador'))) {
      window.location.href = '/login?error=student_required';
    }
  }, [user, role, authLoading]);

  // Load student, schedule, and attendance data
  useEffect(() => {
    if (user) {
      loadStudentData();
    }
  }, [user]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const allAlumnos = await db.getAlumnos();
      const allDocentes = await db.getDocentes();
      const allGrupos = await db.getGrupos();
      const allAsistencias = await db.getAsistencias();

      // Find current student by session identity
      let currentStudent: Alumno | undefined;
      if (user?.matricula) {
        currentStudent = allAlumnos.find(a => a.matricula.toLowerCase() === user.matricula?.toLowerCase());
      }
      if (!currentStudent && user?.id) {
        currentStudent = allAlumnos.find(a => a.id === user.id);
      }
      if (!currentStudent && user?.email) {
        const cleanUserEmail = user.email.toLowerCase();
        currentStudent = allAlumnos.find(a => 
          `${a.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx` === cleanUserEmail ||
          a.matricula.toLowerCase() === cleanUserEmail.split('@')[0]
        );
      }

      setStudent(currentStudent || null);

      if (currentStudent) {
        // 1. Build Assigned Schedules from Superadmin & Docentes records
        const scheduleList: HorarioItemDisplay[] = [];

        // Check assigned teachers with horarios matching student group, carrera and sede
        allDocentes.forEach((doc: Docente) => {
          if (doc.horarios && doc.horarios.length > 0) {
            doc.horarios.forEach((h: HorarioDocenteItem, idx: number) => {
              const groupMatches = isGroupMatch(h.grupo, currentStudent.grupo);
              const carreraMatches = isCarreraMatch(h.carrera, currentStudent.carrera, doc.carreras_asignadas);
              const sedeMatches = isSedeMatch(h.aula, doc.sede_nombre, doc.sede_nombre, currentStudent.sede_nombre, h.es_en_linea);

              // Priority match:
              // 1. Group match + Career match
              // 2. Group match + Sede match
              // 3. Exact Group match
              if (groupMatches && (carreraMatches || sedeMatches || !h.carrera)) {
                scheduleList.push({
                  id: h.id || `sched-${doc.id}-${idx}`,
                  dia: h.dia,
                  hora_inicio: h.hora_inicio,
                  hora_fin: h.hora_fin,
                  materia: h.materia,
                  docente_nombre: `${doc.nombre} ${doc.apellido_paterno} ${doc.apellido_materno || ''}`.trim(),
                  aula: h.aula || (h.es_en_linea ? 'Aula Virtual UNRC (Google Meet)' : doc.sede_nombre) || 'Aula Institucional',
                  sede: doc.sede_nombre || currentStudent?.sede_nombre || 'Campus Magdalena Contreras',
                  grupo: h.grupo || currentStudent.grupo,
                  es_en_linea: h.es_en_linea
                });
              }
            });
          }
        });

        // Also check grupos configured in superadmin
        allGrupos.forEach((g: Grupo, gIdx: number) => {
          if (isGroupMatch(g.clave_grupo, currentStudent.grupo)) {
            const assignedDoc = allDocentes.find(d => 
              d.id === g.docente_id || 
              (g.docente_nombre && `${d.nombre} ${d.apellido_paterno}`.toLowerCase().includes(g.docente_nombre.toLowerCase()))
            );
            const dias = g.dias_clase && g.dias_clase.length > 0 ? g.dias_clase : ['Lunes', 'Miércoles', 'Viernes'];
            
            let horaInicio = '09:00';
            let horaFin = '12:00';
            if (g.horario) {
              const times = g.horario.match(/\d{2}:\d{2}/g);
              if (times && times.length >= 2) {
                horaInicio = times[0];
                horaFin = times[1];
              }
            }

            dias.forEach((d, dIdx) => {
              const alreadyInList = scheduleList.some(s => 
                normalizeDay(s.dia) === normalizeDay(d) &&
                (s.materia.toLowerCase() === (g.materia?.nombre || '').toLowerCase() || isGroupMatch(s.grupo, g.clave_grupo))
              );

              if (!alreadyInList) {
                scheduleList.push({
                  id: `g-sched-${g.id}-${dIdx}`,
                  dia: d,
                  hora_inicio: horaInicio,
                  hora_fin: horaFin,
                  materia: g.materia?.nombre || (currentStudent.carrera?.includes('Datos') ? 'Inteligencia Artificial y Aprendizaje Automático' : 'Materia Curricular Asignada'),
                  docente_nombre: g.docente_nombre || (assignedDoc ? `${assignedDoc.nombre} ${assignedDoc.apellido_paterno}` : 'Docente Titular Asignado'),
                  aula: g.aula || 'Aula Asignada en Campus',
                  sede: g.sede_nombre || currentStudent.sede_nombre || 'Campus Magdalena Contreras',
                  grupo: g.clave_grupo,
                  es_en_linea: g.aula?.toLowerCase().includes('virtual') || false
                });
              }
            });
          }
        });

        // Deduplicate slots with identical day + hora_inicio + materia
        const uniqueSchedules: HorarioItemDisplay[] = [];
        const seenKeys = new Set<string>();
        scheduleList.forEach(item => {
          const key = `${normalizeDay(item.dia)}-${item.hora_inicio}-${item.materia.toLowerCase().trim()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueSchedules.push(item);
          }
        });

        // Sort schedule by day of week
        const dayOrder: Record<string, number> = {
          'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6, 'domingo': 7
        };
        uniqueSchedules.sort((a, b) => (dayOrder[normalizeDay(a.dia)] || 99) - (dayOrder[normalizeDay(b.dia)] || 99));
        setAssignedSchedules(uniqueSchedules);

        // 2. Filter ONLY attendances for this student
        const studentLogs = allAsistencias.filter(
          log => log.alumno_id === currentStudent?.id || log.alumno_id === currentStudent?.matricula
        );
        setAttendances(studentLogs);
      }
    } catch (e) {
      console.error('Error loading student dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Days order helper
  const DAYS_LIST = ['todos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const filteredSchedules = assignedSchedules.filter(s => {
    if (dayFilter === 'todos') return true;
    return normalizeDay(s.dia) === normalizeDay(dayFilter);
  });

  const nextHoliday = getProximoDiaFestivo();

  // Calculate days remaining to next holiday
  const calculateDaysRemaining = (holidayDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(holidayDate + 'T00:00:00');
    const diffTime = target.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Filter holidays
  const filteredHolidays = DIAS_FESTIVOS_UNRC.filter(h => {
    if (holidayFilter === 'suspension') return h.suspension_labores;
    if (holidayFilter === 'conmemorativo') return !h.suspension_labores;
    return true;
  });

  // Attendance metrics
  const totalAttendances = attendances.length;
  const presentCount = attendances.filter(a => !a.estado || a.estado === 'A').length;
  const lateCount = attendances.filter(a => a.estado === 'R').length;
  const absentCount = attendances.filter(a => a.estado === 'F').length;
  const excusedCount = attendances.filter(a => a.estado === 'J').length;

  const attendanceRate = totalAttendances > 0 
    ? Math.round(((presentCount + (lateCount * 0.8)) / Math.max(totalAttendances, 1)) * 100) 
    : 100;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-300">Cargando portal escolar asignado por el Superadmin...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 max-w-xl mx-auto rounded-3xl bg-[#0F172A] border border-rose-500/30 text-center space-y-4 text-white">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-3xl">
          🛡️
        </div>
        <h2 className="text-xl font-bold text-rose-300">Acceso Restringido</h2>
        <p className="text-sm text-gray-300">
          No se encontró un expediente de alumno activo y validado por el Superadmin para la sesión actual.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-bold text-xs"
        >
          Ir al Inicio de Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-white max-w-7xl mx-auto pb-12">
      
      {/* 1. Header Banner with Official UNRC Student Credentials */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#091D32] to-[#0D2D22] p-6 sm:p-8 border border-emerald-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Acceso Validado por Superadmin</span>
              </span>

              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                <span>Grupo {student.grupo}</span>
              </span>

              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <span>{student.grado || '2° Semestre'}</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ¡Hola, {student.nombre} {student.apellido_paterno}!
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>{student.carrera || 'Licenciatura UNRC'}</span>
              </span>
              <span className="text-gray-500">•</span>
              <span className="font-mono text-emerald-300 font-bold">
                Matrícula: {student.matricula}
              </span>
              <span className="text-gray-500">•</span>
              <span className="flex items-center gap-1 text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{student.sede_nombre || 'Campus Magdalena Contreras'}</span>
              </span>
            </div>
          </div>

          {/* Quick Stats: Asistencia & Estado */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-initial bg-black/40 px-5 py-3 rounded-2xl border border-white/10 text-center lg:text-right">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ASISTENCIA OFICIAL</div>
              <div className="text-3xl font-extrabold text-emerald-400">{attendanceRate}%</div>
              <div className="text-[10px] text-gray-400">{totalAttendances} pases registrados</div>
            </div>

            <div className="flex-1 lg:flex-initial bg-black/40 px-4 py-3 rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ESTATUS ESCOLAR</div>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                ACTIVO
              </span>
              <div className="text-[10px] text-emerald-400/80 mt-1">Superadmin OK</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs for Student Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10">
        <button
          onClick={() => setActiveTab('horarios')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'horarios'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Mis Horarios Asignados</span>
        </button>

        <button
          onClick={() => setActiveTab('asistencias')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'asistencias'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>2. Mis Asistencias ({attendanceRate}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('festivos')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'festivos'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>3. Días Festivos y Asuetos</span>
        </button>

        <button
          onClick={() => setActiveTab('credencial')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'credencial'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>4. Mi Credencial QR</span>
        </button>
      </div>

      {/* 3. TAB 1: MIS HORARIOS ASIGNADOS EN EL SUPERADMIN */}
      {activeTab === 'horarios' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Horario Semanal Oficial asignado por el Superadmin</span>
              </h2>
              <p className="text-xs text-gray-400">
                Materias, horarios, aulas y docentes asignados a tu grupo <strong className="text-emerald-300">{student.grupo}</strong> por Rectoría General.
              </p>
            </div>

            {/* Day Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
              {DAYS_LIST.map((dia) => (
                <button
                  key={dia}
                  onClick={() => setDayFilter(dia)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                    dayFilter === dia
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {dia === 'todos' ? 'Todos los días' : dia}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Cards Grid */}
          {filteredSchedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSchedules.map((item) => (
                <div
                  key={item.id}
                  className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-emerald-500/40 transition-all space-y-4 bg-gradient-to-b from-[#0D1526]/80 to-[#070B14]/90 relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] uppercase tracking-wider border border-emerald-500/30">
                        {item.dia}
                      </span>
                      {item.es_en_linea ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          🌐 En Línea
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🏛️ Presencial
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-300 flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{item.hora_inicio} - {item.hora_fin} hrs</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-emerald-300 transition-colors">
                      {item.materia}
                    </h3>
                    <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                      Grupo {item.grupo}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Docente: <strong>{item.docente_nombre}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Aula: <strong>{item.aula}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{item.sede}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-black/30 border border-white/10 space-y-2">
              <div className="text-3xl">🗓️</div>
              <h3 className="text-base font-bold text-gray-300">No hay clases programadas para este filtro.</h3>
              <p className="text-xs text-gray-500">Selecciona "Todos los días" para ver tu horario completo de la semana.</p>
            </div>
          )}

          {/* Superadmin Assignment Note */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-3 text-xs text-blue-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-200">Programación Académica Asignada Centralmente</p>
              <p className="text-blue-300/80 mt-0.5">
                Cualquier cambio de aula, profesor o horario es gestionado y validado en tiempo real por el Superadmin desde el panel institucional de la UNRC.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: MIS ASISTENCIAS PERSONALES */}
      {activeTab === 'asistencias' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">ASISTENCIAS (A)</div>
              <div className="text-3xl font-black text-emerald-400">{presentCount}</div>
              <p className="text-[10px] text-emerald-300/80">Puntuales y completas</p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 bg-amber-950/20 space-y-1">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">RETARDOS (R)</div>
              <div className="text-3xl font-black text-amber-400">{lateCount}</div>
              <p className="text-[10px] text-amber-300/80">Dentro de tolerancia</p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-rose-500/30 bg-rose-950/20 space-y-1">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">FALTAS (F)</div>
              <div className="text-3xl font-black text-rose-400">{absentCount}</div>
              <p className="text-[10px] text-rose-300/80">Inasistencias no justificadas</p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-blue-500/30 bg-blue-950/20 space-y-1">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">JUSTIFICADOS (J)</div>
              <div className="text-3xl font-black text-blue-400">{excusedCount}</div>
              <p className="text-[10px] text-blue-300/80">Con comprobante médico/oficial</p>
            </div>
          </div>

          {/* Attendances Table */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Bitácora de Asistencias Individuales Registradas</span>
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {totalAttendances > 0 ? `${totalAttendances} registros encontrados` : 'Sin registros de falta'}
              </span>
            </div>

            {attendances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-white/5 uppercase text-[10px] text-gray-400 tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Fecha</th>
                      <th className="p-3.5">Hora</th>
                      <th className="p-3.5">Tipo / Registro</th>
                      <th className="p-3.5">Estatus</th>
                      <th className="p-3.5">Ubicación / Dispositivo</th>
                      <th className="p-3.5 rounded-r-xl text-right">Validado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {attendances.map((att) => (
                      <tr key={att.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-bold text-white font-mono">{att.fecha}</td>
                        <td className="p-3.5 font-mono text-emerald-400">{att.hora || '09:00:00'}</td>
                        <td className="p-3.5 capitalize font-semibold">
                          {att.tipo === 'salida' ? '🚶 Salida' : '🚪 Entrada'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            !att.estado || att.estado === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : att.estado === 'R'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : att.estado === 'J'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {!att.estado || att.estado === 'A' ? '✓ PRESENTE' : att.estado === 'R' ? '⏱ RETARDO' : att.estado === 'J' ? '📄 JUSTIFICADO' : '✗ FALTA'}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-400">
                          {att.ubicacion || 'Acceso Plantel Magdalena Contreras'}
                        </td>
                        <td className="p-3.5 text-right font-mono text-blue-400">
                          {att.escaneado_por || 'Escáner QR Oficial'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Registro de Asistencia Impecable</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  No tienes inasistencias acumuladas. Continúa asistiendo a tus clases semanales de acuerdo a tu horario oficial.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 3: DÍAS FESTIVOS Y ASUETOS OFICIALES UNRC */}
      {activeTab === 'festivos' && (
        <div className="space-y-6">
          {/* Next Holiday Banner Card */}
          {nextHoliday && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#1C1508]/60 to-[#0C0F17]/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <span>🔔</span>
                  <span>Próximo Día Festivo / Asueto Institucional</span>
                </div>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  <span>{nextHoliday.icono || '🇲🇽'}</span>
                  <span>{nextHoliday.nombre}</span>
                </h3>
                <p className="text-xs text-gray-300 max-w-xl">
                  {nextHoliday.descripcion}
                </p>
                <div className="text-xs font-mono text-amber-400 font-semibold">
                  Fecha Oficial: {nextHoliday.fecha}
                </div>
              </div>

              <div className="bg-black/50 p-4 rounded-2xl border border-amber-500/30 text-center shrink-0 w-full md:w-auto">
                <div className="text-[10px] text-gray-400 uppercase font-bold">FALTAN</div>
                <div className="text-3xl font-black text-amber-400">
                  {calculateDaysRemaining(nextHoliday.fecha)} días
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {nextHoliday.suspension_labores ? 'Suspensión de Clases' : 'Día Conmemorativo'}
                </span>
              </div>
            </div>
          )}

          {/* Filter and Calendar List */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-400" />
                  <span>Calendario Oficial de Días Festivos y Asuetos (Ciclo 2026 - 2027)</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Aprobado por el Consejo Universitario y la Rectoría General de la Universidad Rosario Castellanos.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => setHolidayFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    holidayFilter === 'todos'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Todos ({DIAS_FESTIVOS_UNRC.length})
                </button>
                <button
                  onClick={() => setHolidayFilter('suspension')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    holidayFilter === 'suspension'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Suspensión de Clases
                </button>
                <button
                  onClick={() => setHolidayFilter('conmemorativo')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    holidayFilter === 'conmemorativo'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Conmemorativos
                </button>
              </div>
            </div>

            {/* Holidays Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHolidays.map((fest) => {
                const daysLeft = calculateDaysRemaining(fest.fecha);
                return (
                  <div
                    key={fest.id}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{fest.icono || '🗓️'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        fest.suspension_labores
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {fest.suspension_labores ? '⛔ SUSPENSIÓN' : '🏛️ CONMEMORATIVO'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-white text-sm group-hover:text-amber-300 transition-colors">
                        {fest.nombre}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {fest.descripcion}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-gray-300 font-semibold">{fest.fecha}</span>
                      <span className="text-amber-400 font-medium">
                        {daysLeft === 0 ? '¡Hoy!' : daysLeft > 0 ? `En ${daysLeft} días` : 'Concluido'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: CREDENCIAL QR DIGITAL DEL ALUMNO */}
      {activeTab === 'credencial' && (
        <div className="max-w-xl mx-auto space-y-6">
          {/* Institutional Credential Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B142F] via-[#2A0815] to-[#090D18] p-8 border-2 border-amber-400/40 shadow-[0_0_50px_rgba(91,20,47,0.4)] space-y-6">
            
            {/* Header Logos */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/unrc_official_logo.png"
                  alt="UNRC Logo"
                  className="h-12 w-auto object-contain rounded-xl"
                />
                <div>
                  <div className="text-xs font-black tracking-widest text-amber-300 uppercase">
                    UNIVERSIDAD NACIONAL
                  </div>
                  <div className="text-sm font-black text-white">
                    ROSARIO CASTELLANOS
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase border border-amber-400/30">
                Ciclo 2026-2027
              </span>
            </div>

            {/* Student Info & QR Code */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
                {/* Live generated QR code matching student matricula */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(student.matricula)}`}
                  alt="Código QR de Alumno"
                  className="w-36 h-36 object-contain"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="text-xs text-gray-400 font-bold uppercase">ALUMNO / ESTUDIANTE</div>
                <h3 className="text-xl font-black text-white leading-tight">
                  {student.nombre} <br />
                  {student.apellido_paterno} {student.apellido_materno || ''}
                </h3>

                <div className="space-y-1 text-xs">
                  <p className="text-emerald-400 font-mono font-bold">
                    Matrícula: {student.matricula}
                  </p>
                  <p className="text-gray-300">
                    {student.carrera || 'Licenciatura en Turismo'}
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    Grupo: <strong>{student.grupo}</strong> • {student.grado || '2° Semestre'}
                  </p>
                </div>
              </div>
            </div>

            {/* Validation Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Credencial Oficial Validada por Superadmin</span>
              </div>
              <span className="font-mono">Sede: Magdalena Contreras</span>
            </div>

          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
            <p className="text-xs font-semibold text-gray-300">
              📲 Esta credencial digital es válida para el ingreso al campus y pase de lista en el aula con tu profesor.
            </p>
            <p className="text-[11px] text-gray-500">
              Muestra el código QR al docente o en el torniquete de acceso para registrar tu asistencia.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
