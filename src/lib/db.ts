import { createClient } from '@supabase/supabase-js';
import { getTijuanaDateString, getTijuanaTimeString } from './tijuanaTime';

// User Roles
export type UserRole = 'alumno' | 'docente' | 'administrador';

// Domain Entities
export interface Sede {
  id: string;
  clave: string;
  nombre: string;
  direccion: string;
  director: string;
  telefono?: string;
  capacidad: number;
  activa: boolean;
}

export interface CicloEscolar {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
}

export interface Grado {
  id: string;
  nombre: string;
  nivel: string;
  orden: number;
}

export interface Seccion {
  id: string;
  nombre: string;
  grado_id: string;
  grado_nombre?: string;
  carrera_id?: string;
  carrera_nombre?: string;
  sede_id?: string;
  sede_nombre?: string;
  turno: 'Matutino' | 'Vespertino' | 'Sabatino';
  aula: string;
  cupo_maximo: number;
}

export interface Carrera {
  id: string;
  clave: string;
  nombre: string;
  nivel: string;
  sede_id?: string;
  sede_nombre?: string;
}

export interface Materia {
  id: string;
  carrera_id: string;
  clave: string;
  nombre: string;
  creditos: number;
  semestre: string;
  horas_semana?: number;
}

export interface Grupo {
  id: string;
  clave_grupo: string;
  carrera_id: string;
  materia_id: string;
  sede_id?: string;
  sede_nombre?: string;
  turno: string;
  periodo: string;
  horario?: string;
  dias_clase?: string[];
  docente_nombre?: string;
  docente_id?: string;
  aula?: string;
  carrera?: Carrera;
  materia?: Materia;
}

export interface HorarioDocenteItem {
  id?: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  carrera: string;
  materia: string;
  grupo: string;
  aula?: string;
  es_en_linea?: boolean;
}

export function getDefaultUserPassword(identifier: string, ciclo = '2026-2'): string {
  const cleanId = (identifier || '').trim();
  const cleanCiclo = (ciclo || '2026-2').replace(/[^0-9-]/g, '').trim() || '2026-2';
  return `${cleanId}-${cleanCiclo}`;
}

export interface Alumno {
  id: string;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  grado: string;
  grupo: string;
  carrera?: string;
  carrera_id?: string;
  grupo_id?: string;
  sede_id?: string;
  sede_nombre?: string;
  ciclo_id?: string;
  estado_matricula?: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante';
  tutor: string;
  telefono: string;
  foto_url?: string;
  qr_code: string;
  password?: string;
  created_at?: string;
}

export interface Docente {
  id: string;
  num_empleado: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  departamento: string;
  puesto?: 'docente' | 'coordinador' | 'secretaria' | 'rectoria';
  materias?: string[];
  carreras_asignadas?: string[];
  horario_resumen?: string;
  horarios?: HorarioDocenteItem[];
  sede_id?: string;
  sede_nombre?: string;
  telefono?: string;
  foto_url?: string;
  password?: string;
  created_at?: string;
}

export interface AuditoriaLog {
  id: string;
  accion: string;
  modulo: string;
  detalle: string;
  usuario: string;
  fecha: string;
}

export interface AnuncioInstitucional {
  id: string;
  titulo: string;
  contenido: string;
  audiencia: 'todos' | 'docentes' | 'alumnos';
  prioridad: 'normal' | 'alta' | 'urgente';
  fecha: string;
  autor: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  role: UserRole;
  avatar_url?: string;
  matricula?: string;
  num_empleado?: string;
  carrera_o_depto?: string;
}

export type EstadoAsistencia = 'A' | 'R' | 'F' | 'J'; // A: Presente, R: Retardo, F: Falta, J: Justificado

export interface Asistencia {
  id: string;
  alumno_id: string;
  grupo_id?: string;
  tipo: 'entrada' | 'salida';
  estado?: EstadoAsistencia;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM:SS
  dispositivo?: string;
  ubicacion?: string;
  escaneado_por?: string;
  observaciones?: string;
  created_at?: string;
  alumno?: Alumno;
}

export interface Participacion {
  id: string;
  alumno_id: string;
  grupo_id?: string;
  fecha: string;
  tipo: 'AP' | 'RP' | 'REGULAR'; // AP: Aprobado/Excelente, RP: Requerido/Por mejorar, REGULAR
  puntos: number;
  observaciones?: string;
  created_at?: string;
  alumno?: Alumno;
}

export interface Tarea {
  id: string;
  grupo_id: string;
  titulo: string;
  descripcion: string;
  ponderacion: number; // e.g. 20%
  fecha_limite: string;
}

export interface EntregaTarea {
  id: string;
  tarea_id: string;
  alumno_id: string;
  fecha_entrega: string;
  calificacion: number;
  estado: 'pendiente' | 'entregado' | 'calificado' | 'retardo';
  retroalimentacion?: string;
}

export interface Proyecto {
  id: string;
  grupo_id: string;
  titulo: string;
  descripcion: string;
  ponderacion: number; // e.g. 25%
  fecha_limite: string;
}

export interface EntregaProyecto {
  id: string;
  proyecto_id: string;
  alumno_id: string;
  calificacion: number;
  estado: 'pendiente' | 'entregado' | 'calificado';
  retroalimentacion?: string;
}

export interface Autoevaluacion {
  id: string;
  alumno_id: string;
  grupo_id: string;
  periodo: string;
  calificacion: number; // max 10
  reflexion: string;
  fecha: string;
}

export interface ResumenAcademico {
  alumno_id: string;
  matricula: string;
  nombre_completo: string;
  carrera: string;
  materia: string;
  grupo: string;
  porcentaje_asistencia: number;
  promedio_participacion: number;
  promedio_tareas: number;
  promedio_proyectos: number;
  autoevaluacion: number;
  calificacion_final: number;
}

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uyqkxqlovxkgurnuxnfd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_F-KMTWS6SQt_hOvo9UGK4A_gbDsM0SQ';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial Mock Seed Data for UNRC
const MOCK_SEDES: Sede[] = [
  { id: 'sede-mc', clave: 'UNRC-MC', nombre: 'Campus Magdalena Contreras', direccion: 'Av. Álvaro Obregón 151, Santa Teresa, La Magdalena Contreras, CDMX', director: 'Dra. María Elena Sandoval', telefono: '+525556830100', capacidad: 1200, activa: true },
  { id: 'sede-js', clave: 'UNRC-JS', nombre: 'Sede Justo Sierra', direccion: 'Calle Justo Sierra 42, Centro Histórico, Cuauhtémoc, CDMX', director: 'Dr. Roberto Mendoza', telefono: '+525555220033', capacidad: 850, activa: true },
  { id: 'sede-coy', clave: 'UNRC-COY', nombre: 'Sede Coyoacán', direccion: 'Calz. de Tlalpan 1890, Country Club, Coyoacán, CDMX', director: 'Mtra. Carmen Trejo', telefono: '+525556891122', capacidad: 950, activa: true },
  { id: 'sede-azc', clave: 'UNRC-AZC', nombre: 'Sede Azcapotzalco', direccion: 'Av. Aquiles Serdán 2060, Santo Domingo, Azcapotzalco, CDMX', director: 'Ing. Fernando Castillo', telefono: '+525553524455', capacidad: 1100, activa: true }
];

const MOCK_CICLOS: CicloEscolar[] = [
  { id: 'ciclo-2026-2', nombre: 'Ciclo Escolar 2026-2 (Otoño)', fecha_inicio: '2026-08-10', fecha_fin: '2026-12-22', is_active: true },
  { id: 'ciclo-2026-1', nombre: 'Ciclo Escolar 2026-1 (Primavera)', fecha_inicio: '2026-01-12', fecha_fin: '2026-06-28', is_active: false },
  { id: 'ciclo-2026-2027', nombre: 'Año Lectivo Completo 2026-2027', fecha_inicio: '2026-08-10', fecha_fin: '2027-07-02', is_active: false }
];

const MOCK_GRADOS: Grado[] = [
  { id: 'g-sem-1', nombre: '1° Semestre', nivel: 'Licenciatura', orden: 1 },
  { id: 'g-sem-2', nombre: '2° Semestre', nivel: 'Licenciatura', orden: 2 },
  { id: 'g-sem-3', nombre: '3° Semestre', nivel: 'Licenciatura', orden: 3 },
  { id: 'g-sem-4', nombre: '4° Semestre', nivel: 'Licenciatura', orden: 4 },
  { id: 'g-sem-5', nombre: '5° Semestre', nivel: 'Licenciatura', orden: 5 },
  { id: 'g-sem-6', nombre: '6° Semestre', nivel: 'Licenciatura', orden: 6 },
  { id: 'g-sem-7', nombre: '7° Semestre', nivel: 'Licenciatura', orden: 7 },
  { id: 'g-sem-8', nombre: '8° Semestre', nivel: 'Licenciatura', orden: 8 }
];

const MOCK_SECCIONES: Seccion[] = [
  { id: 'sec-101', nombre: '101', grado_id: 'g-sem-1', grado_nombre: '1° Semestre', carrera_id: 'c1111111-1111-1111-1111-111111111111', carrera_nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', aula: 'Edificio B - Aula 101', cupo_maximo: 35 },
  { id: 'sec-102', nombre: '102', grado_id: 'g-sem-1', grado_nombre: '1° Semestre', carrera_id: 'c1111111-1111-1111-1111-111111111111', carrera_nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', aula: 'Edificio B - Aula 102', cupo_maximo: 35 },
  { id: 'sec-201-tur', nombre: '201-TUR', grado_id: 'g-sem-2', grado_nombre: '2° Semestre', carrera_id: 'c4444444-4444-4444-4444-444444444444', carrera_nombre: 'Licenciatura en Turismo', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', aula: 'Edificio A - Aula Magna 2', cupo_maximo: 30 },
  { id: 'sec-203-adm', nombre: '203-ADM', grado_id: 'g-sem-2', grado_nombre: '2° Semestre', carrera_id: 'c5555555-5555-5555-5555-555555555555', carrera_nombre: 'Licenciatura en Administración', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', aula: 'Edificio C - Aula 203', cupo_maximo: 40 },
  { id: 'sec-201', nombre: '201', grado_id: 'g-sem-3', grado_nombre: '3° Semestre', carrera_id: 'c2222222-2222-2222-2222-222222222222', carrera_nombre: 'Licenciatura en Tecnologías de la Información y Comunicación', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', turno: 'Vespertino', aula: 'Laboratorio de Cómputo 1', cupo_maximo: 30 },
  { id: 'sec-301', nombre: '301', grado_id: 'g-sem-3', grado_nombre: '3° Semestre', carrera_id: 'c2222222-2222-2222-2222-222222222222', carrera_nombre: 'Licenciatura en Tecnologías de la Información y Comunicación', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', aula: 'Laboratorio Redes 2', cupo_maximo: 30 },
  { id: 'sec-401-lcdn', nombre: '401-LCDN', grado_id: 'g-sem-4', grado_nombre: '4° Semestre', carrera_id: 'c1111111-1111-1111-1111-111111111111', carrera_nombre: 'Licenciatura en Ciencia de Datos para los Negocios', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', aula: 'Laboratorio de Cómputo e IA', cupo_maximo: 35 },
  { id: 'sec-501', nombre: '501', grado_id: 'g-sem-5', grado_nombre: '5° Semestre', carrera_id: 'c3333333-3333-3333-3333-333333333333', carrera_nombre: 'Licenciatura en Ciberseguridad', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', turno: 'Matutino', aula: 'Laboratorio de Seguridad A', cupo_maximo: 25 }
];

const MOCK_CARRERAS: Carrera[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', clave: 'LIC-CDIA', nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', nivel: 'Licenciatura', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras' },
  { id: 'c2222222-2222-2222-2222-222222222222', clave: 'LIC-TIC', nombre: 'Licenciatura en Tecnologías de la Información y Comunicación', nivel: 'Licenciatura', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra' },
  { id: 'c3333333-3333-3333-3333-333333333333', clave: 'LIC-CIB', nombre: 'Licenciatura en Ciberseguridad', nivel: 'Licenciatura', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán' },
  { id: 'c4444444-4444-4444-4444-444444444444', clave: 'LIC-TUR', nombre: 'Licenciatura en Turismo', nivel: 'Licenciatura', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras' },
  { id: 'c5555555-5555-5555-5555-555555555555', clave: 'LIC-ADM', nombre: 'Licenciatura en Administración', nivel: 'Licenciatura', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras' }
];

const MOCK_MATERIAS: Materia[] = [
  { id: 'f1111111-1111-1111-1111-111111111111', carrera_id: 'c1111111-1111-1111-1111-111111111111', clave: 'CDIA-101', nombre: 'Programación Web y Bases de Datos', creditos: 8, semestre: '1° Semestre', horas_semana: 6 },
  { id: 'f2222222-2222-2222-2222-222222222222', carrera_id: 'c1111111-1111-1111-1111-111111111111', clave: 'CDIA-102', nombre: 'Inteligencia Artificial y Aprendizaje Automático', creditos: 10, semestre: '1° Semestre', horas_semana: 6 },
  { id: 'f3333333-3333-3333-3333-333333333333', carrera_id: 'c2222222-2222-2222-2222-222222222222', clave: 'TIC-201', nombre: 'Estructura de Datos y Algoritmos', creditos: 8, semestre: '3° Semestre', horas_semana: 6 },
  { id: 'f4444444-4444-4444-4444-444444444444', carrera_id: 'c2222222-2222-2222-2222-222222222222', clave: 'TIC-301', nombre: 'Ingeniería de Software y Sistemas Web', creditos: 10, semestre: '3° Semestre', horas_semana: 6 },
  { id: 'f5555555-5555-5555-5555-555555555555', carrera_id: 'c3333333-3333-3333-3333-333333333333', clave: 'CIB-501', nombre: 'Ciberseguridad y Auditoría de Sistemas', creditos: 10, semestre: '5° Semestre', horas_semana: 6 },
  { id: 'f6666666-6666-6666-6666-666666666666', carrera_id: 'c4444444-4444-4444-4444-444444444444', clave: 'TUR-201', nombre: 'Administración de Empresas de Hospedaje', creditos: 8, semestre: '2° Semestre', horas_semana: 4 },
  { id: 'f7777777-7777-7777-7777-777777777777', carrera_id: 'c5555555-5555-5555-5555-555555555555', clave: 'ADM-203', nombre: 'Matemáticas para la Administración', creditos: 8, semestre: '2° Semestre', horas_semana: 6 }
];

const MOCK_GRUPOS: Grupo[] = [
  { id: 'g101', clave_grupo: '101', carrera_id: 'c1', materia_id: 'm1', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Lic. Alejandro Valdez', aula: 'Edificio B - Aula 101' },
  { id: 'g102', clave_grupo: '102', carrera_id: 'c1', materia_id: 'm2', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Lic. Alejandro Valdez', aula: 'Edificio B - Aula 102' },
  { id: 'g201', clave_grupo: '201', carrera_id: 'c2', materia_id: 'm3', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', turno: 'Vespertino', periodo: '2026-2', horario: 'Lunes a Sábado (14:00 - 20:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Lic. Beatriz Sánchez', aula: 'Laboratorio de Cómputo 1' },
  { id: 'g201-tur', clave_grupo: '201-TUR', carrera_id: 'c4', materia_id: 'm6', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', periodo: '2026-2', horario: 'Miércoles 09:00 - 11:00 hrs | Sábado 07:00 - 09:00 hrs', dias_clase: ['Miércoles', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', aula: 'Edificio A - Aula Magna 2' },
  { id: 'g203-adm', clave_grupo: '203-ADM', carrera_id: 'c5', materia_id: 'm7', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', aula: 'Edificio C - Aula 203' },
  { id: 'g301', clave_grupo: '301', carrera_id: 'c2', materia_id: 'm4', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Lic. Beatriz Sánchez', aula: 'Laboratorio Redes 2' },
  { id: 'g401-lcdn', clave_grupo: '401-LCDN', carrera_id: 'c1111111-1111-1111-1111-111111111111', materia_id: 'f2222222-2222-2222-2222-222222222222', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', turno: 'Matutino', periodo: '2026-2', horario: 'Miércoles (09:00 - 12:00 hrs) y Lunes (09:00 - 12:00 hrs)', dias_clase: ['Lunes', 'Miércoles', 'Viernes'], docente_nombre: 'Lic. Alejandro Valdez', aula: 'Laboratorio de Cómputo e IA' },
  { id: 'g501', clave_grupo: '501', carrera_id: 'c3', materia_id: 'm5', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Tutor UNRC', aula: 'Laboratorio de Seguridad A' }
];

// Initial mock data for UNRC Alumnos (All 44 Parsed Students)
const MOCK_ALUMNOS: Alumno[] = [
  // Group 201-TUR (Turismo - 6 Alumnos - Docente: Dr. Adrian Silva)
  { id: 'al-1', matricula: 'UNRC-2026-005', nombre: 'Dayanna Gissel', apellido_paterno: 'Buitimea', apellido_materno: 'Garma', grado: '2° Semestre', grupo: '201-TUR', carrera: 'Licenciatura en Turismo', carrera_id: 'c4444444-4444-4444-4444-444444444444', grupo_id: 'g201-tur', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000001', qr_code: 'UNRC-2026-005' },
  { id: 'al-2', matricula: 'UNRC-2026-006', nombre: 'Astrid Cristina', apellido_paterno: 'Diaz', apellido_materno: 'Moreno', grado: '2° Semestre', grupo: '201-TUR', carrera: 'Licenciatura en Turismo', carrera_id: 'c4444444-4444-4444-4444-444444444444', grupo_id: 'g201-tur', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000002', qr_code: 'UNRC-2026-006' },
  { id: 'al-3', matricula: 'UNRC-2026-007', nombre: 'Julibeth', apellido_paterno: 'Hernandez', apellido_materno: 'Herrera', grado: '2° Semestre', grupo: '201-TUR', carrera: 'Licenciatura en Turismo', carrera_id: 'c4444444-4444-4444-4444-444444444444', grupo_id: 'g201-tur', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000003', qr_code: 'UNRC-2026-007' },
  { id: 'al-4', matricula: 'UNRC-2026-008', nombre: 'Blanca Estela', apellido_paterno: 'Lopez', apellido_materno: 'Pablo', grado: '2° Semestre', grupo: '201-TUR', carrera: 'Licenciatura en Turismo', carrera_id: 'c4444444-4444-4444-4444-444444444444', grupo_id: 'g201-tur', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000004', qr_code: 'UNRC-2026-008' },
  { id: 'al-5', matricula: 'UNRC-2026-009', nombre: 'Cecilia', apellido_paterno: 'Todd', apellido_materno: 'Ambriz', grado: '2° Semestre', grupo: '201-TUR', carrera: 'Licenciatura en Turismo', carrera_id: 'c4444444-4444-4444-4444-444444444444', grupo_id: 'g201-tur', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000005', qr_code: 'UNRC-2026-009' },
  { id: 'al-6', matricula: 'UNRC-2026-010', nombre: 'Alejandra', apellido_paterno: 'Garcia', apellido_materno: 'Hernandez', grado: '2° Semestre', grupo: '201-TUR', carrera: 'Licenciatura en Turismo', carrera_id: 'c4444444-4444-4444-4444-444444444444', grupo_id: 'g201-tur', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000006', qr_code: 'UNRC-2026-010' },

  // Group 102
  { id: 'al-7', matricula: 'UNRC-2026-011', nombre: 'Stephanie', apellido_paterno: 'Morales', apellido_materno: 'Flores', grado: '1° Semestre', grupo: '102', carrera: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', carrera_id: 'c1111111-1111-1111-1111-111111111111', grupo_id: 'g102', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000007', qr_code: 'UNRC-2026-011' },
  { id: 'al-8', matricula: 'UNRC-2026-012', nombre: 'Daniel', apellido_paterno: 'Cruz', apellido_materno: 'Mendoza', grado: '1° Semestre', grupo: '102', carrera: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', carrera_id: 'c1111111-1111-1111-1111-111111111111', grupo_id: 'g102', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000008', qr_code: 'UNRC-2026-012' },
  { id: 'al-9', matricula: 'UNRC-2026-013', nombre: 'Giovanni', apellido_paterno: 'Espinoza', apellido_materno: 'Ríos', grado: '1° Semestre', grupo: '102', carrera: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', carrera_id: 'c1111111-1111-1111-1111-111111111111', grupo_id: 'g102', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000009', qr_code: 'UNRC-2026-013' },
  { id: 'al-10', matricula: 'UNRC-2026-014', nombre: 'Edith', apellido_paterno: 'Reyes', apellido_materno: 'Torres', grado: '1° Semestre', grupo: '102', carrera: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', carrera_id: 'c1111111-1111-1111-1111-111111111111', grupo_id: 'g102', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000010', qr_code: 'UNRC-2026-014' },
  { id: 'al-11', matricula: 'UNRC-2026-015', nombre: 'Jose Alberto', apellido_paterno: 'Robles', apellido_materno: 'Anguiano', grado: '1° Semestre', grupo: '102', carrera: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', carrera_id: 'c1111111-1111-1111-1111-111111111111', grupo_id: 'g102', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000011', qr_code: 'UNRC-2026-015' },
  { id: 'al-12', matricula: 'UNRC-2026-016', nombre: 'Daniel', apellido_paterno: 'Ruffo', apellido_materno: 'Vázquez', grado: '1° Semestre', grupo: '102', carrera: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', carrera_id: 'c1111111-1111-1111-1111-111111111111', grupo_id: 'g102', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000012', qr_code: 'UNRC-2026-016' },

  // Group 201
  { id: 'al-13', matricula: 'UNRC-2026-017', nombre: 'Emili Janeht', apellido_paterno: 'Armenta', apellido_materno: 'Mancinas', grado: '3° Semestre', grupo: '201', carrera: 'Licenciatura en Tecnologías de la Información y Comunicación', carrera_id: 'c2222222-2222-2222-2222-222222222222', grupo_id: 'g201', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000013', qr_code: 'UNRC-2026-017' },
  { id: 'al-14', matricula: 'UNRC-2026-018', nombre: 'Quintero Jacobo', apellido_paterno: 'Chrissier', apellido_materno: 'Magdiel', grado: '3° Semestre', grupo: '201', carrera: 'Licenciatura en Tecnologías de la Información y Comunicación', carrera_id: 'c2222222-2222-2222-2222-222222222222', grupo_id: 'g201', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000014', qr_code: 'UNRC-2026-018' },
  { id: 'al-15', matricula: 'UNRC-2026-019', nombre: 'Ivan', apellido_paterno: 'Medina', apellido_materno: 'Silva', grado: '3° Semestre', grupo: '201', carrera: 'Licenciatura en Tecnologías de la Información y Comunicación', carrera_id: 'c2222222-2222-2222-2222-222222222222', grupo_id: 'g201', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000015', qr_code: 'UNRC-2026-019' },
  { id: 'al-16', matricula: 'UNRC-2026-020', nombre: 'Bardo', apellido_paterno: 'Rojo', apellido_materno: 'Castillo', grado: '3° Semestre', grupo: '201', carrera: 'Licenciatura en Tecnologías de la Información y Comunicación', carrera_id: 'c2222222-2222-2222-2222-222222222222', grupo_id: 'g201', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000016', qr_code: 'UNRC-2026-020' },
  { id: 'al-17', matricula: 'UNRC-2026-021', nombre: 'Roselvina Mayeth', apellido_paterno: 'Sanchez', apellido_materno: 'Dominguez', grado: '3° Semestre', grupo: '201', carrera: 'Licenciatura en Tecnologías de la Información y Comunicación', carrera_id: 'c2222222-2222-2222-2222-222222222222', grupo_id: 'g201', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000017', qr_code: 'UNRC-2026-021' },
  { id: 'al-18', matricula: 'UNRC-2026-022', nombre: 'Luis Armando', apellido_paterno: 'Triche', apellido_materno: 'Ramirez', grado: '3° Semestre', grupo: '201', carrera: 'Licenciatura en Tecnologías de la Información y Comunicación', carrera_id: 'c2222222-2222-2222-2222-222222222222', grupo_id: 'g201', sede_id: 'sede-js', sede_nombre: 'Sede Justo Sierra', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000018', qr_code: 'UNRC-2026-022' },

  // Group 203-ADM (Lic. en Administración - Dr. Adrian Silva - 22 Alumnos)
  { id: 'al-19', matricula: 'UNRC-2026-023', nombre: 'Gabriela Erandi', apellido_paterno: 'Capilla', apellido_materno: 'Manuel', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000019', qr_code: 'UNRC-2026-023' },
  { id: 'al-20', matricula: 'UNRC-2026-024', nombre: 'Angélica', apellido_paterno: 'Altamirano', apellido_materno: 'Solórzano', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000020', qr_code: 'UNRC-2026-024' },
  { id: 'al-21', matricula: 'UNRC-2026-025', nombre: 'Magali', apellido_paterno: 'Arce', apellido_materno: 'Garcia', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000021', qr_code: 'UNRC-2026-025' },
  { id: 'al-22', matricula: 'UNRC-2026-026', nombre: 'Michell Evelin', apellido_paterno: 'Cruz', apellido_materno: 'Alcantara', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000022', qr_code: 'UNRC-2026-026' },
  { id: 'al-23', matricula: 'UNRC-2026-027', nombre: 'Michel Monserrat', apellido_paterno: 'De anda', apellido_materno: 'Montalvo', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000023', qr_code: 'UNRC-2026-027' },
  { id: 'al-24', matricula: 'UNRC-2026-028', nombre: 'Samuel Anthony', apellido_paterno: 'De la cruz', apellido_materno: 'López', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000024', qr_code: 'UNRC-2026-028' },
  { id: 'al-25', matricula: 'UNRC-2026-029', nombre: 'Estefanía', apellido_paterno: 'Espinosa', apellido_materno: 'Aguilar', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000025', qr_code: 'UNRC-2026-029' },
  { id: 'al-26', matricula: 'UNRC-2026-030', nombre: 'Maria Dolores', apellido_paterno: 'Garcia', apellido_materno: 'Delgado', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000026', qr_code: 'UNRC-2026-030' },
  { id: 'al-27', matricula: 'UNRC-2026-031', nombre: 'Ana Maria', apellido_paterno: 'Jimenez', apellido_materno: 'Ramirez', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000027', qr_code: 'UNRC-2026-031' },
  { id: 'al-28', matricula: 'UNRC-2026-032', nombre: 'Jaciel Berenice', apellido_paterno: 'Mendoza', apellido_materno: 'Hacho', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000028', qr_code: 'UNRC-2026-032' },
  { id: 'al-29', matricula: 'UNRC-2026-033', nombre: 'Sherlyn de Jesus', apellido_paterno: 'Vergara', apellido_materno: 'Puga', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000029', qr_code: 'UNRC-2026-033' },
  { id: 'al-30', matricula: 'UNRC-2026-034', nombre: 'Francisco Raul', apellido_paterno: 'Riego', apellido_materno: 'Manzano', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000030', qr_code: 'UNRC-2026-034' },
  { id: 'al-31', matricula: 'UNRC-2026-035', nombre: 'Juan Carlos', apellido_paterno: 'Román', apellido_materno: 'Perez', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000031', qr_code: 'UNRC-2026-035' },
  { id: 'al-32', matricula: 'UNRC-2026-036', nombre: 'Diana', apellido_paterno: 'Cruz', apellido_materno: 'Soriano', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000032', qr_code: 'UNRC-2026-036' },
  { id: 'al-33', matricula: 'UNRC-2026-037', nombre: 'Cristian Jeova', apellido_paterno: 'Trejo', apellido_materno: 'Flores', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000033', qr_code: 'UNRC-2026-037' },
  { id: 'al-34', matricula: 'UNRC-2026-038', nombre: 'Jackelyn', apellido_paterno: 'Uribe', apellido_materno: 'Zuñiga', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000034', qr_code: 'UNRC-2026-038' },
  { id: 'al-35', matricula: 'UNRC-2026-039', nombre: 'Angel Alfredo', apellido_paterno: 'Zarate', apellido_materno: 'Cobilt', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000035', qr_code: 'UNRC-2026-039' },
  { id: 'al-36', matricula: 'UNRC-2026-040', nombre: 'Hector', apellido_paterno: 'Rivera', apellido_materno: 'Murillo', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000036', qr_code: 'UNRC-2026-040' },
  { id: 'al-37', matricula: 'UNRC-2026-041', nombre: 'Miguel Ángel', apellido_paterno: 'Romo', apellido_materno: 'Sandoval', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000041', qr_code: 'UNRC-2026-041' },
  { id: 'al-38', matricula: 'UNRC-2026-042', nombre: 'Jessica Lizeth', apellido_paterno: 'Mata', apellido_materno: 'Bautista', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000042', qr_code: 'UNRC-2026-042' },
  { id: 'al-39', matricula: 'UNRC-2026-043', nombre: 'Berenice Malena', apellido_paterno: 'Torres', apellido_materno: 'Reyes', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000043', qr_code: 'UNRC-2026-043' },
  { id: 'al-40', matricula: 'UNRC-2026-044', nombre: 'Lizbeth', apellido_paterno: 'Magallon', apellido_materno: 'Vázquez', grado: '2° Semestre', grupo: '203-ADM', carrera: 'Licenciatura en Administración', carrera_id: 'c5555555-5555-5555-5555-555555555555', grupo_id: 'g203-adm', sede_id: 'sede-mc', sede_nombre: 'Campus Magdalena Contreras', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Dr. Adrian Silva', telefono: '+525510000044', qr_code: 'UNRC-2026-044' },

  // Group 501
  { id: 'al-41', matricula: 'UNRC-2026-045', nombre: 'Carlos', apellido_paterno: 'Alcantar', apellido_materno: 'Sanchez', grado: '5° Semestre', grupo: '501', carrera: 'Licenciatura en Ciberseguridad', carrera_id: 'c3333333-3333-3333-3333-333333333333', grupo_id: 'g501', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000045', qr_code: 'UNRC-2026-045' },
  { id: 'al-42', matricula: 'UNRC-2026-046', nombre: 'Oscar', apellido_paterno: 'Cendejas', apellido_materno: 'Flores', grado: '5° Semestre', grupo: '501', carrera: 'Licenciatura en Ciberseguridad', carrera_id: 'c3333333-3333-3333-3333-333333333333', grupo_id: 'g501', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000046', qr_code: 'UNRC-2026-046' },
  { id: 'al-43', matricula: 'UNRC-2026-047', nombre: 'José Daniel', apellido_paterno: 'Pérez', apellido_materno: 'Gómez', grado: '5° Semestre', grupo: '501', carrera: 'Licenciatura en Ciberseguridad', carrera_id: 'c3333333-3333-3333-3333-333333333333', grupo_id: 'g501', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000047', qr_code: 'UNRC-2026-047' },
  { id: 'al-44', matricula: 'UNRC-2026-048', nombre: 'Jazmin', apellido_paterno: 'Guzman', apellido_materno: 'López', grado: '5° Semestre', grupo: '501', carrera: 'Licenciatura en Ciberseguridad', carrera_id: 'c3333333-3333-3333-3333-333333333333', grupo_id: 'g501', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000048', qr_code: 'UNRC-2026-048' },
  { id: 'al-45', matricula: 'UNRC-2026-049', nombre: 'Dani', apellido_paterno: 'Herrera', apellido_materno: 'Martínez', grado: '5° Semestre', grupo: '501', carrera: 'Licenciatura en Ciberseguridad', carrera_id: 'c3333333-3333-3333-3333-333333333333', grupo_id: 'g501', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000049', qr_code: 'UNRC-2026-049' },
  { id: 'al-46', matricula: 'UNRC-2026-050', nombre: 'Adad', apellido_paterno: 'Sanchez', apellido_materno: 'Ortiz', grado: '5° Semestre', grupo: '501', carrera: 'Licenciatura en Ciberseguridad', carrera_id: 'c3333333-3333-3333-3333-333333333333', grupo_id: 'g501', sede_id: 'sede-coy', sede_nombre: 'Sede Coyoacán', ciclo_id: 'ciclo-2026-2', estado_matricula: 'activo', tutor: 'Tutor UNRC', telefono: '+525510000050', qr_code: 'UNRC-2026-050' }
];

// Initial Mock Seed for Docentes y Personal Institucional
const MOCK_DOCENTES: Docente[] = [
  {
    id: 'docente-1',
    num_empleado: 'DOC-UNRC-01',
    nombre: 'Alejandro',
    apellido_paterno: 'Valdez',
    apellido_materno: 'Mendoza',
    email: 'alejandro.valdez@rcastellanos.cdmx.gob.mx',
    departamento: 'Lic. en Ciencias de Datos e IA',
    puesto: 'docente',
    carreras_asignadas: ['Lic. en Ciencias de Datos e Inteligencia Artificial', 'Licenciatura en Ciencia de Datos para los Negocios'],
    materias: ['Programación Web y Bases de Datos', 'Inteligencia Artificial y Aprendizaje Automático', 'Minería de Datos y Modelado Predictivo'],
    horario_resumen: 'Lunes a Sábado (07:00 - 13:00 hrs)',
    horarios: [
      { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '10:00', carrera: 'Lic. en Ciencias de Datos e Inteligencia Artificial', materia: 'Programación Web y Bases de Datos', grupo: '101', aula: 'Edificio B - Aula 101', es_en_linea: false },
      { dia: 'Miércoles', hora_inicio: '07:00', hora_fin: '10:00', carrera: 'Lic. en Ciencias de Datos e Inteligencia Artificial', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '102', aula: 'Edificio B - Aula 102', es_en_linea: false },
      { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '401-LCDN', aula: 'Laboratorio de Cómputo e IA', es_en_linea: false },
      { dia: 'Lunes', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Programación Web y Bases de Datos', grupo: '401-LCDN', aula: 'Laboratorio de Cómputo e IA', es_en_linea: false },
      { dia: 'Viernes', hora_inicio: '08:00', hora_fin: '11:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Minería de Datos y Modelado Predictivo', grupo: '401-LCDN', aula: 'Aula Virtual UNRC (Google Meet)', es_en_linea: true }
    ],
    sede_nombre: 'Campus Magdalena Contreras',
    telefono: '+525599887766',
    foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  },
  {
    id: 'docente-2',
    num_empleado: 'DOC-UNRC-02',
    nombre: 'Beatriz',
    apellido_paterno: 'Sánchez',
    apellido_materno: 'Pineda',
    email: 'beatriz.sanchez@rcastellanos.cdmx.gob.mx',
    departamento: 'Lic. en TIC',
    puesto: 'docente',
    carreras_asignadas: ['Lic. en Tecnologías de la Información y Comunicación'],
    materias: ['Estructura de Datos y Algoritmos', 'Ingeniería de Software y Sistemas Web'],
    horario_resumen: 'Lunes a Sábado (14:00 - 20:00 hrs)',
    horarios: [
      { dia: 'Martes', hora_inicio: '14:00', hora_fin: '17:00', carrera: 'Lic. en Tecnologías de la Información y Comunicación', materia: 'Estructura de Datos y Algoritmos', grupo: '201', aula: 'Laboratorio de Cómputo 1' },
      { dia: 'Jueves', hora_inicio: '14:00', hora_fin: '17:00', carrera: 'Lic. en Tecnologías de la Información y Comunicación', materia: 'Ingeniería de Software y Sistemas Web', grupo: '301', aula: 'Laboratorio Redes 2' }
    ],
    sede_nombre: 'Sede Justo Sierra',
    telefono: '+525588776655',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  },
  {
    id: 'docente-3',
    num_empleado: 'DOC-UNRC-03',
    nombre: 'Adrian',
    apellido_paterno: 'Silva',
    apellido_materno: '',
    email: 'adrian.silva@rcastellanos.cdmx.gob.mx',
    departamento: 'Lic. en Administración / Lic. en Turismo',
    puesto: 'docente',
    carreras_asignadas: ['Lic. en Turismo', 'Lic. en Administración'],
    materias: ['Administración de Empresas de Hospedaje', 'Matemáticas para la Administración'],
    horario_resumen: 'Miércoles (09:00 - 11:00 hrs) y Sábados (07:00 - 09:00 hrs)',
    horarios: [
      { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '11:00', carrera: 'Lic. en Turismo', materia: 'Administración de Empresas de Hospedaje', grupo: '201-TUR', aula: 'Edificio A - Aula Magna 2', es_en_linea: false },
      { dia: 'Sábado', hora_inicio: '07:00', hora_fin: '09:00', carrera: 'Lic. en Turismo', materia: 'Administración de Empresas de Hospedaje', grupo: '201-TUR', aula: 'Aula Virtual UNRC (Google Meet)', es_en_linea: true },
      { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '09:00', carrera: 'Lic. en Administración', materia: 'Matemáticas para la Administración', grupo: '203-ADM', aula: 'Edificio C - Aula 203', es_en_linea: false }
    ],
    sede_nombre: 'Campus Magdalena Contreras',
    telefono: '+525511223344',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  },
  {
    id: 'personal-rec-1',
    num_empleado: 'DIR-UNRC-01',
    nombre: 'Alma Rosa',
    apellido_paterno: 'Sánchez',
    apellido_materno: 'García',
    email: 'rectoria@rcastellanos.cdmx.gob.mx',
    departamento: 'Rectoría General UNRC',
    puesto: 'rectoria',
    carreras_asignadas: ['Dirección Institucional'],
    materias: [],
    horario_resumen: 'Lunes a Viernes (08:00 - 17:00 hrs)',
    horarios: [],
    sede_nombre: 'Campus Magdalena Contreras',
    telefono: '+525556830101',
    foto_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  },
  {
    id: 'personal-sec-1',
    num_empleado: 'SEC-UNRC-02',
    nombre: 'Guillermo',
    apellido_paterno: 'Navarrete',
    apellido_materno: 'Ortiz',
    email: 'secretaria.academica@rcastellanos.cdmx.gob.mx',
    departamento: 'Secretaría Académica y Escolar',
    puesto: 'secretaria',
    carreras_asignadas: ['Coordinación Curricular'],
    materias: [],
    horario_resumen: 'Lunes a Viernes (08:00 - 18:00 hrs)',
    horarios: [],
    sede_nombre: 'Campus Magdalena Contreras',
    telefono: '+525556830102',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  // Sync core institutional catalogs
  if (!localStorage.getItem('unrc_sedes')) {
    localStorage.setItem('unrc_sedes', JSON.stringify(MOCK_SEDES));
  }
  if (!localStorage.getItem('unrc_ciclos')) {
    localStorage.setItem('unrc_ciclos', JSON.stringify(MOCK_CICLOS));
  }
  if (!localStorage.getItem('unrc_grados')) {
    localStorage.setItem('unrc_grados', JSON.stringify(MOCK_GRADOS));
  }
  if (!localStorage.getItem('unrc_secciones')) {
    localStorage.setItem('unrc_secciones', JSON.stringify(MOCK_SECCIONES));
  }

  // Institutional catalogs initialized once
  if (!localStorage.getItem('unrc_carreras')) {
    localStorage.setItem('unrc_carreras', JSON.stringify(MOCK_CARRERAS));
  }
  if (!localStorage.getItem('unrc_materias')) {
    localStorage.setItem('unrc_materias', JSON.stringify(MOCK_MATERIAS));
  }
  if (!localStorage.getItem('unrc_grupos')) {
    localStorage.setItem('unrc_grupos', JSON.stringify(MOCK_GRUPOS));
  }
  
  if (!localStorage.getItem('unrc_docentes_v2')) {
    localStorage.setItem('unrc_docentes', JSON.stringify(MOCK_DOCENTES));
    localStorage.setItem('unrc_docentes_v2', 'true');
  }

  if (!localStorage.getItem('unrc_alumnos_v4')) {
    localStorage.setItem('unrc_alumnos', JSON.stringify(MOCK_ALUMNOS));
    localStorage.setItem('unrc_alumnos_v4', 'true');
  }

  // Seed Participaciones if empty
  if (!localStorage.getItem('unrc_participaciones')) {
    const mockParticipaciones: Participacion[] = [
      { id: 'p1', alumno_id: 'al-2', grupo_id: 'g201-tur', fecha: '2026-09-05', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Excelente aportación en clase de Hospedaje' },
      { id: 'p2', alumno_id: 'al-5', grupo_id: 'g201-tur', fecha: '2026-09-05', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Aportación activa en gestión hotelera' },
      { id: 'p3', alumno_id: 'al-6', grupo_id: 'g201-tur', fecha: '2026-09-05', tipo: 'RP', puntos: 5, observaciones: 'Requerido: Repaso de empresas de hospedaje' },
      { id: 'p4', alumno_id: 'al-7', grupo_id: 'g102', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Exposición clara de conceptos' },
      { id: 'p5', alumno_id: 'al-8', grupo_id: 'g102', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Resolución de ejercicio en pizarrón' },
      { id: 'p6', alumno_id: 'al-9', grupo_id: 'g102', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Participación en debate de IA' },
      { id: 'p7', alumno_id: 'al-10', grupo_id: 'g102', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Aportación activa' },
      { id: 'p8', alumno_id: 'al-14', grupo_id: 'g201', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Explicación de algoritmos' },
      { id: 'p9', alumno_id: 'al-15', grupo_id: 'g201', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Aportación activa' },
      { id: 'p10', alumno_id: 'al-16', grupo_id: 'g201', fecha: '2026-09-10', tipo: 'RP', puntos: 5, observaciones: 'Requerido: Repaso recomendado' },
      { id: 'p11', alumno_id: 'al-18', grupo_id: 'g201', fecha: '2026-09-10', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Trabajo colaborativo' }
    ];
    localStorage.setItem('unrc_participaciones', JSON.stringify(mockParticipaciones));
  }

  // Seed Asistencias if empty or refresh for Turismo Wednesdays & Saturdays
  if (!localStorage.getItem('unrc_asistencias_v2')) {
    const mockAsistencias: Asistencia[] = [
      // Turismo (Grupo 201-TUR) - Wednesday 09-11am & Saturday 07-09am
      { id: 'as-tur-1', alumno_id: 'al-1', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '09:02:00', observaciones: 'Miércoles (09:00 - 11:00) Presente' },
      { id: 'as-tur-2', alumno_id: 'al-1', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:01:00', observaciones: 'Sábado (07:00 - 09:00) Presente' },
      { id: 'as-tur-3', alumno_id: 'al-1', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-09', hora: '09:05:00', observaciones: 'Miércoles (09:00 - 11:00) Presente' },
      { id: 'as-tur-4', alumno_id: 'al-1', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-12', hora: '07:00:00', observaciones: 'Sábado (07:00 - 09:00) Presente' },

      { id: 'as-tur-5', alumno_id: 'al-2', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '09:00:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-6', alumno_id: 'al-2', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:05:00', observaciones: 'Sábado Presente' },
      { id: 'as-tur-7', alumno_id: 'al-2', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-09', hora: '09:01:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-8', alumno_id: 'al-2', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'R', fecha: '2026-09-12', hora: '07:18:00', observaciones: 'Sábado Retardo' },

      { id: 'as-tur-9', alumno_id: 'al-3', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '09:00:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-10', alumno_id: 'al-3', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:00:00', observaciones: 'Sábado Presente' },
      { id: 'as-tur-11', alumno_id: 'al-3', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-09', hora: '09:00:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-12', alumno_id: 'al-3', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-12', hora: '07:02:00', observaciones: 'Sábado Presente' },

      { id: 'as-tur-13', alumno_id: 'al-4', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '09:04:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-14', alumno_id: 'al-4', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:00:00', observaciones: 'Sábado Presente' },
      { id: 'as-tur-15', alumno_id: 'al-4', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'R', fecha: '2026-09-09', hora: '09:16:00', observaciones: 'Miércoles Retardo' },
      { id: 'as-tur-16', alumno_id: 'al-4', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-12', hora: '07:01:00', observaciones: 'Sábado Presente' },

      { id: 'as-tur-17', alumno_id: 'al-5', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '09:00:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-18', alumno_id: 'al-5', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:02:00', observaciones: 'Sábado Presente' },
      { id: 'as-tur-19', alumno_id: 'al-5', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-09', hora: '09:00:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-20', alumno_id: 'al-5', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-12', hora: '07:00:00', observaciones: 'Sábado Presente' },

      { id: 'as-tur-21', alumno_id: 'al-6', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '09:01:00', observaciones: 'Miércoles Presente' },
      { id: 'as-tur-22', alumno_id: 'al-6', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:03:00', observaciones: 'Sábado Presente' },
      { id: 'as-tur-23', alumno_id: 'al-6', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'J', fecha: '2026-09-09', hora: '09:00:00', observaciones: 'Miércoles Justificado' },
      { id: 'as-tur-24', alumno_id: 'al-6', grupo_id: 'g201-tur', tipo: 'entrada', estado: 'A', fecha: '2026-09-12', hora: '07:00:00', observaciones: 'Sábado Presente' },

      // Other groups
      { id: 'as-5', alumno_id: 'al-9', grupo_id: 'g102', tipo: 'entrada', estado: 'R', fecha: '2026-09-08', hora: '07:22:00', observaciones: 'Retardo' },
      { id: 'as-6', alumno_id: 'al-10', grupo_id: 'g102', tipo: 'entrada', estado: 'J', fecha: '2026-09-08', hora: '07:00:00', observaciones: 'Justificante médico' },
      { id: 'as-7', alumno_id: 'al-16', grupo_id: 'g201', tipo: 'entrada', estado: 'R', fecha: '2026-09-08', hora: '07:18:00', observaciones: 'Retardo' },
      { id: 'as-8', alumno_id: 'al-16', grupo_id: 'g201', tipo: 'entrada', estado: 'R', fecha: '2026-09-10', hora: '07:15:00', observaciones: 'Retardo' },
      { id: 'as-9', alumno_id: 'al-45', grupo_id: 'g501', tipo: 'entrada', estado: 'J', fecha: '2026-09-11', hora: '07:00:00', observaciones: 'Justificado' }
    ];
    localStorage.setItem('unrc_asistencias', JSON.stringify(mockAsistencias));
    localStorage.setItem('unrc_asistencias_v2', 'true');
  }

  // Seed Auditorias
  if (!localStorage.getItem('unrc_auditorias')) {
    const mockAuditorias: AuditoriaLog[] = [
      { id: 'aud-1', accion: 'SISTEMA_INICIADO', modulo: 'Núcleo ERP', detalle: 'Inicialización de ciclo escolar 2026-2027 y módulos de seguridad RLS', usuario: 'Super Admin / Rectoría', fecha: new Date(Date.now() - 86400000 * 2).toISOString().replace('T', ' ').substring(0, 19) },
      { id: 'aud-2', accion: 'ASIGNACION_DOCENTE', modulo: 'Plan Académico', detalle: 'Asignación del Dr. Adrian Silva a Grupos 201-TUR (Hospedaje) y 203-ADM (Matemáticas)', usuario: 'Secretaría Académica', fecha: new Date(Date.now() - 86400000).toISOString().replace('T', ' ').substring(0, 19) },
      { id: 'aud-3', accion: 'MATRICULA_EXPEDIENTES', modulo: 'Servicios Escolares', detalle: 'Carga y validación biométrica de 44 expedientes estudiantiles UNRC', usuario: 'Control Escolar', fecha: new Date(Date.now() - 3600000 * 4).toISOString().replace('T', ' ').substring(0, 19) },
      { id: 'aud-4', accion: 'SINCRONIZACION_ASISTENCIA', modulo: 'Control de Asistencia', detalle: 'Cierre de bitácora diaria de asistencia de Turismo (Miércoles 09-11 y Sábado 07-09)', usuario: 'Dr. Adrian Silva', fecha: new Date().toISOString().replace('T', ' ').substring(0, 19) }
    ];
    localStorage.setItem('unrc_auditorias', JSON.stringify(mockAuditorias));
  }

  // Seed Anuncios
  if (!localStorage.getItem('unrc_anuncios')) {
    const mockAnuncios: AnuncioInstitucional[] = [
      { id: 'anu-1', titulo: 'Inicio Oficial de Clases e Inducción Ciclo 2026-2', contenido: 'Se convoca a todos los estudiantes de nuevo ingreso y reingreso a revisar sus horarios en el portal institucional.', audiencia: 'todos', prioridad: 'alta', fecha: '2026-09-01', autor: 'Rectoría UNRC' },
      { id: 'anu-2', titulo: 'Horarios Oficiales - Lic. en Turismo (Grupo 201-TUR)', contenido: 'Se reitera el horario de la materia Administración de Empresas de Hospedaje con el Dr. Adrian Silva: Miércoles de 09:00 a 11:00 hrs y Sábados de 07:00 a 09:00 hrs.', audiencia: 'alumnos', prioridad: 'urgente', fecha: '2026-09-05', autor: 'Coordinación de Turismo' },
      { id: 'anu-3', titulo: 'Entrega de Evaluaciones y Reportes de Asistencia Parcial', contenido: 'Recordatorio a todo el personal docente de consolidar participaciones y asistencias en la plataforma antes del cierre de actas.', audiencia: 'docentes', prioridad: 'normal', fecha: '2026-09-10', autor: 'Secretaría Académica' }
    ];
    localStorage.setItem('unrc_anuncios', JSON.stringify(mockAnuncios));
  }
};

// Database API Implementation
export const db = {
  isSandboxMode: () => {
    return !isSupabaseConfigured;
  },

  // Sedes operations
  getSedes: async (): Promise<Sede[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_sedes');
    return raw ? JSON.parse(raw) : MOCK_SEDES;
  },

  addSede: async (sede: Omit<Sede, 'id'>): Promise<Sede> => {
    initLocalStorage();
    const list = await db.getSedes();
    const newSede: Sede = {
      ...sede,
      id: `sede-${Date.now()}`
    };
    list.push(newSede);
    localStorage.setItem('unrc_sedes', JSON.stringify(list));
    await db.addAuditoria('ALTA_SEDE', 'Infraestructura / Sedes', `Se registró la sede ${newSede.nombre} (${newSede.clave})`, 'Rectoría / Super Admin');
    return newSede;
  },

  updateSede: async (id: string, updates: Partial<Sede>): Promise<Sede | null> => {
    initLocalStorage();
    const list = await db.getSedes();
    const index = list.findIndex(s => s.id === id || s.clave === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    localStorage.setItem('unrc_sedes', JSON.stringify(list));
    await db.addAuditoria('MODIFICACION_SEDE', 'Infraestructura / Sedes', `Actualización de sede ${list[index].nombre}`, 'Rectoría / Super Admin');
    return list[index];
  },

  deleteSede: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getSedes();
    const target = list.find(s => s.id === id || s.clave === id);
    list = list.filter(s => s.id !== id && s.clave !== id);
    localStorage.setItem('unrc_sedes', JSON.stringify(list));
    if (target) {
      await db.addAuditoria('BAJA_SEDE', 'Infraestructura / Sedes', `Se eliminó sede ${target.nombre}`, 'Rectoría / Super Admin');
    }
    return true;
  },

  // Ciclos Escolares operations
  getCiclosEscolares: async (): Promise<CicloEscolar[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_ciclos');
    return raw ? JSON.parse(raw) : MOCK_CICLOS;
  },

  addCicloEscolar: async (ciclo: Omit<CicloEscolar, 'id'>): Promise<CicloEscolar> => {
    initLocalStorage();
    const list = await db.getCiclosEscolares();
    const newCiclo: CicloEscolar = {
      ...ciclo,
      id: `ciclo-${Date.now()}`
    };
    if (newCiclo.is_active) {
      list.forEach(c => c.is_active = false);
    }
    list.push(newCiclo);
    localStorage.setItem('unrc_ciclos', JSON.stringify(list));
    await db.addAuditoria('ALTA_CICLO', 'Calendario y Periodos', `Se creó el ciclo escolar ${newCiclo.nombre}`, 'Secretaría Académica');
    return newCiclo;
  },

  activarCicloEscolar: async (id: string): Promise<CicloEscolar | null> => {
    initLocalStorage();
    const list = await db.getCiclosEscolares();
    let activated: CicloEscolar | null = null;
    list.forEach(c => {
      if (c.id === id) {
        c.is_active = true;
        activated = c;
      } else {
        c.is_active = false;
      }
    });
    localStorage.setItem('unrc_ciclos', JSON.stringify(list));
    if (activated) {
      const act = activated as CicloEscolar;
      await db.addAuditoria('ACTIVACION_CICLO', 'Calendario y Periodos', `Se activó oficialmente el periodo ${act.nombre}`, 'Rectoría');
    }
    return activated;
  },

  deleteCicloEscolar: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getCiclosEscolares();
    const target = list.find(c => c.id === id);
    list = list.filter(c => c.id !== id);
    localStorage.setItem('unrc_ciclos', JSON.stringify(list));
    if (target) {
      await db.addAuditoria('BAJA_CICLO', 'Calendario y Periodos', `Se eliminó periodo ${target.nombre}`, 'Secretaría Académica');
    }
    return true;
  },

  // Grados operations
  getGrados: async (): Promise<Grado[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_grados');
    return raw ? JSON.parse(raw) : MOCK_GRADOS;
  },

  addGrado: async (grado: Omit<Grado, 'id'>): Promise<Grado> => {
    initLocalStorage();
    const list = await db.getGrados();
    const newGrado: Grado = {
      ...grado,
      id: `grado-${Date.now()}`
    };
    list.push(newGrado);
    list.sort((a, b) => a.orden - b.orden);
    localStorage.setItem('unrc_grados', JSON.stringify(list));
    await db.addAuditoria('ALTA_GRADO', 'Estructura Curricular', `Se configuró nivel/semestre ${newGrado.nombre}`, 'Secretaría Académica');
    return newGrado;
  },

  deleteGrado: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getGrados();
    list = list.filter(g => g.id !== id);
    localStorage.setItem('unrc_grados', JSON.stringify(list));
    return true;
  },

  // Secciones / Grupos operations
  getSecciones: async (): Promise<Seccion[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_secciones');
    let list: Seccion[] = raw ? JSON.parse(raw) : MOCK_SECCIONES;

    let modified = false;
    list = list.map((sec) => {
      let updatedSec = { ...sec };
      const cId = (sec.carrera_id || '').toLowerCase();
      const cNombre = sec.carrera_nombre || '';

      if (
        cId === 'c1' ||
        cId === '' ||
        cId.includes('c1111111') ||
        cNombre === 'Licenciatura UNRC' ||
        cNombre === '' ||
        cNombre.toLowerCase().includes('datos') ||
        sec.aula?.includes('Edificio B')
      ) {
        if (!cId.includes('c2') && !cId.includes('c3') && !cId.includes('c4') && !cId.includes('c5')) {
          if (
            updatedSec.carrera_id !== 'c1111111-1111-1111-1111-111111111111' ||
            updatedSec.carrera_nombre !== 'Licenciatura en Ciencias de Datos e Inteligencia Artificial'
          ) {
            updatedSec.carrera_id = 'c1111111-1111-1111-1111-111111111111';
            updatedSec.carrera_nombre = 'Licenciatura en Ciencias de Datos e Inteligencia Artificial';
            modified = true;
          }
        }
      } else if (cId === 'c2' || cId.includes('c2222222') || cNombre.toLowerCase().includes('tecnolog')) {
        if (
          updatedSec.carrera_id !== 'c2222222-2222-2222-2222-222222222222' ||
          updatedSec.carrera_nombre !== 'Licenciatura en Tecnologías de la Información y Comunicación'
        ) {
          updatedSec.carrera_id = 'c2222222-2222-2222-2222-222222222222';
          updatedSec.carrera_nombre = 'Licenciatura en Tecnologías de la Información y Comunicación';
          modified = true;
        }
      } else if (cId === 'c3' || cId.includes('c3333333') || cNombre.toLowerCase().includes('ciber')) {
        if (
          updatedSec.carrera_id !== 'c3333333-3333-3333-3333-333333333333' ||
          updatedSec.carrera_nombre !== 'Licenciatura en Ciberseguridad'
        ) {
          updatedSec.carrera_id = 'c3333333-3333-3333-3333-333333333333';
          updatedSec.carrera_nombre = 'Licenciatura en Ciberseguridad';
          modified = true;
        }
      } else if (cId === 'c4' || cId.includes('c4444444') || cNombre.toLowerCase().includes('turis')) {
        if (
          updatedSec.carrera_id !== 'c4444444-4444-4444-4444-444444444444' ||
          updatedSec.carrera_nombre !== 'Licenciatura en Turismo'
        ) {
          updatedSec.carrera_id = 'c4444444-4444-4444-4444-444444444444';
          updatedSec.carrera_nombre = 'Licenciatura en Turismo';
          modified = true;
        }
      } else if (cId === 'c5' || cId.includes('c5555555') || cNombre.toLowerCase().includes('admin')) {
        if (
          updatedSec.carrera_id !== 'c5555555-5555-5555-5555-555555555555' ||
          updatedSec.carrera_nombre !== 'Licenciatura en Administración'
        ) {
          updatedSec.carrera_id = 'c5555555-5555-5555-5555-555555555555';
          updatedSec.carrera_nombre = 'Licenciatura en Administración';
          modified = true;
        }
      }
      return updatedSec;
    });

    if (!list.some(s => s.nombre === '401-LCDN')) {
      list.push({
        id: 'sec-401-lcdn',
        nombre: '401-LCDN',
        grado_id: 'g-sem-4',
        grado_nombre: '4° Semestre',
        carrera_id: 'c1111111-1111-1111-1111-111111111111',
        carrera_nombre: 'Licenciatura en Ciencia de Datos para los Negocios',
        sede_id: 'sede-mc',
        sede_nombre: 'Campus Magdalena Contreras',
        turno: 'Matutino',
        aula: 'Laboratorio de Cómputo e IA',
        cupo_maximo: 35
      });
      modified = true;
    }

    if (modified && typeof window !== 'undefined') {
      localStorage.setItem('unrc_secciones', JSON.stringify(list));
    }
    return list;
  },

  addSeccion: async (sec: Omit<Seccion, 'id'>): Promise<Seccion> => {
    initLocalStorage();
    const list = await db.getSecciones();
    const newSec: Seccion = {
      ...sec,
      id: `sec-${Date.now()}`
    };
    list.push(newSec);
    localStorage.setItem('unrc_secciones', JSON.stringify(list));
    await db.addAuditoria('ALTA_SECCION', 'Espacios y Aulas', `Se habilitó sección ${newSec.nombre} (${newSec.turno}) en ${newSec.aula}`, 'Control Escolar');
    return newSec;
  },

  updateSeccion: async (id: string, updates: Partial<Seccion>): Promise<Seccion | null> => {
    initLocalStorage();
    const list = await db.getSecciones();
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    localStorage.setItem('unrc_secciones', JSON.stringify(list));
    await db.addAuditoria('MODIFICACION_SECCION', 'Espacios y Aulas', `Se actualizó sección ${list[index].nombre}`, 'Control Escolar');
    return list[index];
  },

  deleteSeccion: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getSecciones();
    const target = list.find(s => s.id === id);
    list = list.filter(s => s.id !== id);
    localStorage.setItem('unrc_secciones', JSON.stringify(list));
    if (target) {
      await db.addAuditoria('BAJA_SECCION', 'Espacios y Aulas', `Se eliminó sección ${target.nombre}`, 'Control Escolar');
    }
    return true;
  },

  // Asignar docente carreras y horarios
  asignarDocenteHorarioCarreras: async (
    docenteId: string,
    params: {
      carreras_asignadas: string[];
      materias: string[];
      horario_resumen: string;
      horarios: HorarioDocenteItem[];
      sede_nombre?: string;
    }
  ): Promise<Docente | null> => {
    initLocalStorage();
    let docentes = await db.getDocentes();
    let index = docentes.findIndex(d =>
      d.id === docenteId ||
      d.num_empleado === docenteId ||
      (docenteId.includes('01') && (d.num_empleado === 'DOC-UNRC-01' || d.id === 'docente-1' || d.id === 'a1111111-1111-1111-1111-111111111111')) ||
      (docenteId.includes('02') && (d.num_empleado === 'DOC-UNRC-02' || d.id === 'docente-2' || d.id === 'b2222222-2222-2222-2222-222222222222')) ||
      (docenteId.includes('03') && (d.num_empleado === 'DOC-UNRC-03' || d.id === 'docente-3' || d.id === 'd0000003-0000-0000-0000-000000000003'))
    );

    if (index === -1) {
      const mock = MOCK_DOCENTES.find(m => m.id === docenteId || m.num_empleado === docenteId) || MOCK_DOCENTES[0];
      const newDoc: Docente = {
        ...mock,
        id: docenteId,
        carreras_asignadas: params.carreras_asignadas,
        materias: params.materias,
        horario_resumen: params.horario_resumen,
        horarios: params.horarios,
        sede_nombre: params.sede_nombre || mock.sede_nombre
      };
      docentes.push(newDoc);
      index = docentes.length - 1;
    } else {
      docentes[index] = {
        ...docentes[index],
        carreras_asignadas: params.carreras_asignadas,
        materias: params.materias,
        horario_resumen: params.horario_resumen,
        horarios: params.horarios,
        sede_nombre: params.sede_nombre || docentes[index].sede_nombre
      };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(docentes));
    }

    // Sync to Supabase in background
    if (supabase) {
      try {
        const payload: Record<string, any> = {
          materias: params.materias,
          departamento: params.carreras_asignadas.join(' / ')
        };
        await supabase
          .from('docentes')
          .update(payload)
          .eq('num_empleado', docentes[index].num_empleado);
      } catch (err) {
        console.warn('Supabase assignation background update:', err);
      }
    }

    // Also link to grupos so teachers reflect across groups
    try {
      const grupos = await db.getGrupos();
      params.horarios.forEach(h => {
        const gIdx = grupos.findIndex(g => g.clave_grupo === h.grupo);
        if (gIdx !== -1) {
          grupos[gIdx].docente_nombre = `${docentes[index].nombre} ${docentes[index].apellido_paterno}`;
          grupos[gIdx].docente_id = docentes[index].id;
          grupos[gIdx].horario = `${h.dia} (${h.hora_inicio} - ${h.hora_fin} hrs)`;
          if (h.aula) grupos[gIdx].aula = h.aula;
        } else if (h.grupo) {
          grupos.push({
            id: `g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            clave_grupo: h.grupo,
            carrera_id: 'c1111111-1111-1111-1111-111111111111',
            materia_id: 'm-auto',
            sede_id: docentes[index].sede_nombre || 'sede-mc',
            sede_nombre: docentes[index].sede_nombre || 'Campus Magdalena Contreras',
            turno: 'Matutino',
            periodo: '2026-2',
            horario: `${h.dia} (${h.hora_inicio} - ${h.hora_fin} hrs)`,
            dias_clase: [h.dia],
            docente_nombre: `${docentes[index].nombre} ${docentes[index].apellido_paterno}`,
            docente_id: docentes[index].id,
            aula: h.aula || 'Aula Asignada'
          });
        }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('unrc_grupos', JSON.stringify(grupos));
      }
    } catch (ge) {
      console.warn('Grupos link notice:', ge);
    }

    await db.addAuditoria(
      'ASIGNACION_DOCENTE_HORARIO',
      'Programación Docente',
      `Asignación de carreras [${params.carreras_asignadas.join(', ')}] y horarios para ${docentes[index].nombre} ${docentes[index].apellido_paterno}: ${params.horario_resumen}`,
      'Secretaría Académica'
    );

    return docentes[index];
  },

  // Carreras operations
  getCarreras: async (): Promise<Carrera[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_carreras');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error parsing unrc_carreras:', e);
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('carreras').select('*');
        if (!error && data && data.length > 0) {
          const list: Carrera[] = data.map((sc: any) => ({
            id: sc.id,
            clave: sc.clave,
            nombre: sc.nombre,
            nivel: sc.nivel || 'Licenciatura',
            sede_id: sc.sede_id || 'sede-mc',
            sede_nombre: sc.sede_nombre || 'Campus Magdalena Contreras'
          }));
          localStorage.setItem('unrc_carreras', JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn('Fallback carreras:', err);
      }
    }

    localStorage.setItem('unrc_carreras', JSON.stringify(MOCK_CARRERAS));
    return MOCK_CARRERAS;
  },

  // Materias operations
  getMaterias: async (): Promise<Materia[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_materias');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error parsing unrc_materias:', e);
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('materias').select('*');
        if (!error && data && data.length > 0) {
          const list: Materia[] = data.map((sm: any) => ({
            id: sm.id,
            carrera_id: sm.carrera_id,
            clave: sm.clave,
            nombre: sm.nombre,
            creditos: sm.creditos || 8,
            semestre: sm.semestre || '1° Semestre',
            horas_semana: 6
          }));
          localStorage.setItem('unrc_materias', JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn('Fallback materias:', err);
      }
    }

    localStorage.setItem('unrc_materias', JSON.stringify(MOCK_MATERIAS));
    return MOCK_MATERIAS;
  },

  // Grupos operations
  getGrupos: async (): Promise<Grupo[]> => {
    initLocalStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('grupos').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Fallback grupos:', err);
      }
    }
    const raw = localStorage.getItem('unrc_grupos');
    let list: Grupo[] = raw ? JSON.parse(raw) : MOCK_GRUPOS;
    if (!list.some(g => g.clave_grupo === '401-LCDN')) {
      list.push({
        id: 'g401-lcdn',
        clave_grupo: '401-LCDN',
        carrera_id: 'c1111111-1111-1111-1111-111111111111',
        materia_id: 'f2222222-2222-2222-2222-222222222222',
        sede_id: 'sede-mc',
        sede_nombre: 'Campus Magdalena Contreras',
        turno: 'Matutino',
        periodo: '2026-2',
        horario: 'Miércoles (09:00 - 12:00 hrs) y Lunes (09:00 - 12:00 hrs)',
        dias_clase: ['Lunes', 'Miércoles', 'Viernes'],
        docente_nombre: 'Lic. Alejandro Valdez',
        aula: 'Laboratorio de Cómputo e IA'
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('unrc_grupos', JSON.stringify(list));
      }
    }
    return list;
  },

  addCarrera: async (carrera: Omit<Carrera, 'id'>): Promise<Carrera> => {
    initLocalStorage();
    const list = await db.getCarreras();
    const newCarrera: Carrera = {
      ...carrera,
      id: `c-${Date.now()}`
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('carreras')
          .insert([{
            clave: newCarrera.clave,
            nombre: newCarrera.nombre,
            nivel: newCarrera.nivel
          }])
          .select();
        if (!error && data && data[0]?.id) {
          newCarrera.id = data[0].id;
        }
      } catch (e) {
        console.warn('Supabase carrera insert:', e);
      }
    }

    list.push(newCarrera);
    localStorage.setItem('unrc_carreras', JSON.stringify(list));
    await db.addAuditoria('ALTA_CARRERA', 'Oferta Académica', `Se registró la carrera ${newCarrera.nombre} (${newCarrera.clave})`, 'Administrador');
    return newCarrera;
  },

  deleteCarrera: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getCarreras();
    const target = list.find(c => c.id === id || c.clave === id);
    const targetId = target ? target.id : id;
    list = list.filter(c => c.id !== targetId && c.clave !== id);
    localStorage.setItem('unrc_carreras', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('carreras').delete().eq('id', targetId);
      } catch (e) {
        console.warn('Supabase carrera delete notice:', e);
      }
    }

    if (target) {
      await db.addAuditoria('BAJA_CARRERA', 'Oferta Académica', `Se eliminó la carrera ${target.nombre} (${target.clave})`, 'Administrador');
    }
    return true;
  },

  updateCarrera: async (id: string, updates: Partial<Carrera>): Promise<Carrera | null> => {
    initLocalStorage();
    let list = await db.getCarreras();
    let index = list.findIndex(c =>
      c.id === id ||
      c.clave === id ||
      (updates.clave && c.clave === updates.clave) ||
      (id.startsWith('c1') && (c.id === 'c1' || c.clave === 'LIC-CDIA')) ||
      (id.startsWith('c2') && (c.id === 'c2' || c.clave === 'LIC-TIC')) ||
      (id.startsWith('c3') && (c.id === 'c3' || c.clave === 'LIC-CIB')) ||
      (id.startsWith('c4') && (c.id === 'c4' || c.clave === 'LIC-TUR')) ||
      (id.startsWith('c5') && (c.id === 'c5' || c.clave === 'LIC-ADM'))
    );

    if (index === -1) {
      const newCar: Carrera = {
        id: id || `c-${Date.now()}`,
        clave: updates.clave || 'CARR',
        nombre: updates.nombre || 'Nueva Carrera',
        nivel: updates.nivel || 'Licenciatura',
        sede_id: updates.sede_id || 'sede-mc',
        sede_nombre: updates.sede_nombre || 'Campus Magdalena Contreras',
        ...updates
      };
      list.push(newCar);
      index = list.length - 1;
    }

    list[index] = { ...list[index], ...updates };
    localStorage.setItem('unrc_carreras', JSON.stringify(list));

    // Propagate updated carrera name to alumnos and secciones if changed
    if (updates.nombre) {
      try {
        const rawAlumnos = localStorage.getItem('unrc_alumnos');
        if (rawAlumnos) {
          const alumnos = JSON.parse(rawAlumnos);
          let changed = false;
          alumnos.forEach((a: any) => {
            if (a.carrera_id === id || a.carrera_id === list[index].id || a.carrera === list[index].nombre) {
              a.carrera = updates.nombre;
              changed = true;
            }
          });
          if (changed) localStorage.setItem('unrc_alumnos', JSON.stringify(alumnos));
        }

        const rawSec = localStorage.getItem('unrc_secciones');
        if (rawSec) {
          const sec = JSON.parse(rawSec);
          let secChanged = false;
          sec.forEach((s: any) => {
            if (s.carrera_id === id || s.carrera_id === list[index].id || s.carrera_nombre === list[index].nombre) {
              s.carrera_nombre = updates.nombre;
              secChanged = true;
            }
          });
          if (secChanged) localStorage.setItem('unrc_secciones', JSON.stringify(sec));
        }
      } catch (e) {
        console.warn('Sync related carrera entities notice:', e);
      }
    }

    if (supabase) {
      try {
        const supabasePayload: Record<string, any> = {};
        if (updates.clave !== undefined) supabasePayload.clave = updates.clave;
        if (updates.nombre !== undefined) supabasePayload.nombre = updates.nombre;
        if (updates.nivel !== undefined) supabasePayload.nivel = updates.nivel;

        if (Object.keys(supabasePayload).length > 0) {
          await supabase
            .from('carreras')
            .update(supabasePayload)
            .eq('id', list[index].id);
        }
      } catch (e) {
        console.warn('Supabase carrera update notice:', e);
      }
    }
    await db.addAuditoria('MODIFICACION_CARRERA', 'Oferta Académica', `Se actualizó la carrera ${list[index].nombre} (${list[index].clave})`, 'Administrador');
    return list[index];
  },

  addMateria: async (materia: Omit<Materia, 'id'>): Promise<Materia> => {
    initLocalStorage();
    const list = await db.getMaterias();
    const newMateria: Materia = {
      ...materia,
      id: `m-${Date.now()}`
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('materias')
          .insert([{
            carrera_id: newMateria.carrera_id,
            clave: newMateria.clave,
            nombre: newMateria.nombre,
            creditos: newMateria.creditos,
            semestre: newMateria.semestre
          }])
          .select();
        if (!error && data && data[0]?.id) {
          newMateria.id = data[0].id;
        }
      } catch (e) {
        console.warn('Supabase materia insert:', e);
      }
    }

    list.push(newMateria);
    localStorage.setItem('unrc_materias', JSON.stringify(list));
    await db.addAuditoria('ALTA_MATERIA', 'Plan Curricular', `Se agregó asignatura ${newMateria.nombre} (${newMateria.clave})`, 'Administrador');
    return newMateria;
  },

  updateMateria: async (id: string, updates: Partial<Materia>): Promise<Materia | null> => {
    initLocalStorage();
    let list = await db.getMaterias();
    let index = list.findIndex(m =>
      m.id === id ||
      m.clave === id ||
      (updates.clave && m.clave === updates.clave) ||
      (id.startsWith('f1') && (m.id === 'm1' || m.clave === 'CDIA-101')) ||
      (id.startsWith('f2') && (m.id === 'm2' || m.clave === 'CDIA-102')) ||
      (id.startsWith('f3') && (m.id === 'm3' || m.clave === 'TIC-201')) ||
      (id.startsWith('f4') && (m.id === 'm4' || m.clave === 'TIC-301')) ||
      (id.startsWith('f5') && (m.id === 'm5' || m.clave === 'CIB-501')) ||
      (id.startsWith('f6') && (m.id === 'm6' || m.clave === 'TUR-201')) ||
      (id.startsWith('f7') && (m.id === 'm7' || m.clave === 'ADM-203'))
    );

    if (index === -1) {
      const newMat: Materia = {
        id: id || `m-${Date.now()}`,
        carrera_id: updates.carrera_id || 'c1',
        clave: updates.clave || 'MAT',
        nombre: updates.nombre || 'Nueva Materia',
        creditos: updates.creditos || 8,
        semestre: updates.semestre || '1° Semestre',
        horas_semana: updates.horas_semana || 6,
        ...updates
      };
      list.push(newMat);
      index = list.length - 1;
    }

    list[index] = { ...list[index], ...updates };
    localStorage.setItem('unrc_materias', JSON.stringify(list));

    if (supabase) {
      try {
        const supabasePayload: Record<string, any> = {};
        if (updates.carrera_id !== undefined) supabasePayload.carrera_id = updates.carrera_id;
        if (updates.clave !== undefined) supabasePayload.clave = updates.clave;
        if (updates.nombre !== undefined) supabasePayload.nombre = updates.nombre;
        if (updates.creditos !== undefined) supabasePayload.creditos = updates.creditos;
        if (updates.semestre !== undefined) supabasePayload.semestre = updates.semestre;

        if (Object.keys(supabasePayload).length > 0) {
          await supabase
            .from('materias')
            .update(supabasePayload)
            .eq('id', list[index].id);
        }
      } catch (e) {
        console.warn('Supabase materia update notice:', e);
      }
    }
    await db.addAuditoria('MODIFICACION_MATERIA', 'Plan Curricular', `Se actualizó la asignatura ${list[index].nombre} (${list[index].clave})`, 'Administrador');
    return list[index];
  },

  deleteMateria: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getMaterias();
    const target = list.find(m => m.id === id || m.clave === id);
    const targetId = target ? target.id : id;
    list = list.filter(m => m.id !== targetId && m.clave !== id);
    localStorage.setItem('unrc_materias', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('materias').delete().eq('id', targetId);
      } catch (e) {
        console.warn('Supabase materia delete notice:', e);
      }
    }

    if (target) {
      await db.addAuditoria('BAJA_MATERIA', 'Plan Curricular', `Se eliminó asignatura ${target.nombre}`, 'Administrador');
    }
    return true;
  },

  addGrupo: async (grupo: Omit<Grupo, 'id'>): Promise<Grupo> => {
    initLocalStorage();
    const list = await db.getGrupos();
    const newGrupo: Grupo = {
      ...grupo,
      id: `g-${Date.now()}`
    };
    list.push(newGrupo);
    localStorage.setItem('unrc_grupos', JSON.stringify(list));
    if (supabase) {
      try {
        await supabase.from('grupos').insert([newGrupo]);
      } catch (e) {
        console.warn('Supabase grupo insert:', e);
      }
    }
    await db.addAuditoria('ASIGNACION_HORARIO', 'Programación Docente', `Grupo ${newGrupo.clave_grupo} asignado a ${newGrupo.docente_nombre || 'Docente'} con horario: ${newGrupo.horario}`, 'Administrador');
    return newGrupo;
  },

  updateGrupo: async (id: string, updates: Partial<Grupo>): Promise<Grupo | null> => {
    initLocalStorage();
    const list = await db.getGrupos();
    const index = list.findIndex(g => g.id === id || g.clave_grupo === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    localStorage.setItem('unrc_grupos', JSON.stringify(list));
    await db.addAuditoria('MODIFICACION_GRUPO', 'Programación Docente', `Horario o docente de Grupo ${list[index].clave_grupo} actualizado`, 'Administrador');
    return list[index];
  },

  deleteGrupo: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getGrupos();
    list = list.filter(g => g.id !== id && g.clave_grupo !== id);
    localStorage.setItem('unrc_grupos', JSON.stringify(list));
    await db.addAuditoria('ELIMINACION_GRUPO', 'Programación Docente', `Se eliminó asignación de grupo ${id}`, 'Administrador');
    return true;
  },

  // Alumnos operations
  getAlumnos: async (): Promise<Alumno[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_alumnos');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let hadChanges = false;
          const enriched = parsed.map((a: Alumno) => {
            let item = { ...a };
            const cName = (item.carrera || '').toLowerCase();
            const cId = (item.carrera_id || '').toLowerCase();

            // Check for students uploaded to Tijuana or with group 301 that belong to Data Science but got misassigned to Turismo
            const isMisassignedTijuanaDatos =
              (item.sede_nombre?.toLowerCase().includes('tijuana') || item.sede_id?.toLowerCase().includes('tijuana')) &&
              (item.grupo === '301' || item.grupo === '201' || item.grupo === '101' || ['UNRC-2026-057', 'UNRC-2026-058', 'UNRC-2026-059', 'UNRC-2026-061'].includes(item.matricula));

            if (isMisassignedTijuanaDatos && item.carrera?.toLowerCase().includes('turismo')) {
              hadChanges = true;
              item.carrera = 'Licenciatura en Ciencias de Datos e Inteligencia Artificial';
              item.carrera_id = 'c1111111-1111-1111-1111-111111111111';
              item.tutor = 'Mtro. Fernando Gómez';
            } else if (
              cId === 'c1111111-1111-1111-1111-111111111111' ||
              cName.includes('datos') ||
              cName.includes('negocios') ||
              cName.includes('lcdn') ||
              cName.includes('cdia') ||
              cName.includes('inteligencia') ||
              cId === 'c1'
            ) {
              if (item.carrera !== 'Licenciatura en Ciencias de Datos e Inteligencia Artificial' || item.carrera_id !== 'c1111111-1111-1111-1111-111111111111') {
                hadChanges = true;
                item.carrera = 'Licenciatura en Ciencias de Datos e Inteligencia Artificial';
                item.carrera_id = 'c1111111-1111-1111-1111-111111111111';
              }
            } else if (cId === 'c5555555-5555-5555-5555-555555555555' || cName.includes('administra') || cId === 'c5') {
              if (item.carrera !== 'Licenciatura en Administración' || item.carrera_id !== 'c5555555-5555-5555-5555-555555555555') {
                hadChanges = true;
                item.carrera = 'Licenciatura en Administración';
                item.carrera_id = 'c5555555-5555-5555-5555-555555555555';
              }
            } else if (cId === 'c4444444-4444-4444-4444-444444444444' || cName.includes('turis') || cId === 'c4') {
              if (item.carrera !== 'Licenciatura en Turismo' || item.carrera_id !== 'c4444444-4444-4444-4444-444444444444') {
                hadChanges = true;
                item.carrera = 'Licenciatura en Turismo';
                item.carrera_id = 'c4444444-4444-4444-4444-444444444444';
              }
            } else if (cId === 'c2222222-2222-2222-2222-222222222222' || cName.includes('tic') || cName.includes('tecnolog') || cId === 'c2') {
              if (item.carrera !== 'Licenciatura en Tecnologías de la Información y Comunicación' || item.carrera_id !== 'c2222222-2222-2222-2222-222222222222') {
                hadChanges = true;
                item.carrera = 'Licenciatura en Tecnologías de la Información y Comunicación';
                item.carrera_id = 'c2222222-2222-2222-2222-222222222222';
              }
            } else if (cId === 'c3333333-3333-3333-3333-333333333333' || cName.includes('ciber') || cId === 'c3') {
              if (item.carrera !== 'Licenciatura en Ciberseguridad' || item.carrera_id !== 'c3333333-3333-3333-3333-333333333333') {
                hadChanges = true;
                item.carrera = 'Licenciatura en Ciberseguridad';
                item.carrera_id = 'c3333333-3333-3333-3333-333333333333';
              }
            }

            if (!item.password) {
              hadChanges = true;
              item.password = getDefaultUserPassword(item.matricula, '2026-2');
            }
            return item;
          });
          if (hadChanges) {
            localStorage.setItem('unrc_alumnos', JSON.stringify(enriched));
          }
          return enriched.sort((a: Alumno, b: Alumno) =>
            (a.apellido_paterno || '').localeCompare(b.apellido_paterno || '')
          );
        }
      } catch (e) {
        console.warn('Error parsing unrc_alumnos:', e);
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (!error && data && data.length > 0) {
          const list: Alumno[] = data.map((sa: any) => {
            const mockMatch = MOCK_ALUMNOS.find(m => m.matricula === sa.matricula);
            const cName = (sa.carrera || mockMatch?.carrera || '').toLowerCase();
            const cId = (sa.carrera_id || mockMatch?.carrera_id || '').toLowerCase();
            const isTurismo = cName.includes('turis') || cId.includes('c4');
            const isAdm = cName.includes('admin') || cId.includes('c5');
            const isCdIA = cName.includes('datos') || cName.includes('inteligencia') || cId.includes('c1');
            const isTic = cName.includes('tic') || cName.includes('tecnolog') || cId.includes('c2');
            const isCib = cName.includes('ciber') || cId.includes('c3');

            return {
              ...mockMatch,
              ...sa,
              carrera: isTurismo
                ? 'Licenciatura en Turismo'
                : isAdm
                ? 'Licenciatura en Administración'
                : isCdIA
                ? 'Licenciatura en Ciencias de Datos e Inteligencia Artificial'
                : isTic
                ? 'Licenciatura en Tecnologías de la Información y Comunicación'
                : isCib
                ? 'Licenciatura en Ciberseguridad'
                : sa.carrera || mockMatch?.carrera || 'Licenciatura UNRC',
              carrera_id: isTurismo
                ? 'c4444444-4444-4444-4444-444444444444'
                : isAdm
                ? 'c5555555-5555-5555-5555-555555555555'
                : isCdIA
                ? 'c1111111-1111-1111-1111-111111111111'
                : isTic
                ? 'c2222222-2222-2222-2222-222222222222'
                : isCib
                ? 'c3333333-3333-3333-3333-333333333333'
                : sa.carrera_id || mockMatch?.carrera_id || '',
              tutor: isTurismo ? 'Dr. Adrian Silva' : isAdm ? 'Dr. Adrian Silva' : sa.tutor || mockMatch?.tutor || 'Tutor Registrado',
              password: sa.password || mockMatch?.password || getDefaultUserPassword(sa.matricula, '2026-2'),
              sede_id: sa.sede_id || mockMatch?.sede_id || '',
              sede_nombre: sa.sede_nombre || mockMatch?.sede_nombre || '',
              ciclo_id: sa.ciclo_id || mockMatch?.ciclo_id || 'ciclo-2026-2',
              estado_matricula: sa.estado_matricula || mockMatch?.estado_matricula || 'activo',
              grupo_id: sa.grupo_id || mockMatch?.grupo_id || (isTurismo ? 'g201-tur' : isAdm ? 'g203-adm' : 'g101')
            };
          });
          localStorage.setItem('unrc_alumnos', JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn('Falling back to local data:', err);
      }
    }

    const seeded = MOCK_ALUMNOS.map(a => ({
      ...a,
      password: a.password || getDefaultUserPassword(a.matricula, '2026-2')
    }));
    localStorage.setItem('unrc_alumnos', JSON.stringify(seeded));
    return seeded.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  },

  getAlumnoByQR: async (qrCode: string): Promise<Alumno | null> => {
    const list = await db.getAlumnos();
    return list.find(a => a.qr_code === qrCode || a.matricula === qrCode) || null;
  },

  addAlumno: async (alumno: Omit<Alumno, 'id' | 'created_at'>): Promise<Alumno> => {
    initLocalStorage();
    const list = await db.getAlumnos();
    const newAlumno: Alumno = {
      ...alumno,
      password: alumno.password || getDefaultUserPassword(alumno.matricula, '2026-2'),
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const supabasePayload = {
          matricula: newAlumno.matricula,
          nombre: newAlumno.nombre,
          apellido_paterno: newAlumno.apellido_paterno,
          apellido_materno: newAlumno.apellido_materno,
          grado: newAlumno.grado,
          grupo: newAlumno.grupo,
          carrera: newAlumno.carrera,
          tutor: newAlumno.tutor,
          telefono: newAlumno.telefono,
          qr_code: newAlumno.qr_code,
          carrera_id: newAlumno.carrera_id,
          grupo_id: newAlumno.grupo_id
        };
        const { data, error } = await supabase
          .from('alumnos')
          .insert([supabasePayload])
          .select()
          .single();
        if (!error && data?.id) {
          newAlumno.id = data.id;
        }
      } catch (e) {
        console.warn('Supabase insert notice:', e);
      }
    }

    list.push(newAlumno);
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));
    return newAlumno;
  },

  addAlumnosBulk: async (
    alumnos: (Omit<Alumno, 'id' | 'created_at'> & { id?: string; created_at?: string })[],
    options: { updateExisting?: boolean } = { updateExisting: true }
  ): Promise<{ added: number; updated: number; items: Alumno[] }> => {
    initLocalStorage();
    const current = await db.getAlumnos();
    const processedItems: Alumno[] = [];
    let addedCount = 0;
    let updatedCount = 0;

    for (let idx = 0; idx < alumnos.length; idx++) {
      const al = alumnos[idx];
      const matriculaClean = (al.matricula || '').trim();
      if (!matriculaClean) continue;

      const existingIndex = current.findIndex(
        (a) => (a.matricula || '').trim().toLowerCase() === matriculaClean.toLowerCase()
      );

      const resolvedPassword =
        al.password && al.password.trim()
          ? al.password.trim()
          : getDefaultUserPassword(matriculaClean, '2026-2');

      const resolvedQRCode = al.qr_code && al.qr_code.trim() ? al.qr_code.trim() : matriculaClean;

      if (existingIndex >= 0) {
        if (options.updateExisting !== false) {
          const existing = current[existingIndex];
          const updatedItem: Alumno = {
            ...existing,
            ...al,
            id: existing.id,
            matricula: matriculaClean,
            password: al.password?.trim() || existing.password || resolvedPassword,
            qr_code: resolvedQRCode,
            estado_matricula: al.estado_matricula || existing.estado_matricula || 'activo',
            created_at: existing.created_at || new Date().toISOString()
          };
          current[existingIndex] = updatedItem;
          processedItems.push(updatedItem);
          updatedCount++;
        }
      } else {
        const newItem: Alumno = {
          ...al,
          id: al.id || `student-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          matricula: matriculaClean,
          password: resolvedPassword,
          qr_code: resolvedQRCode,
          estado_matricula: al.estado_matricula || 'activo',
          created_at: al.created_at || new Date().toISOString()
        };
        current.push(newItem);
        processedItems.push(newItem);
        addedCount++;
      }
    }

    localStorage.setItem('unrc_alumnos', JSON.stringify(current));

    if (supabase && processedItems.length > 0) {
      try {
        const supabasePayload = processedItems.map((item) => ({
          matricula: item.matricula,
          nombre: item.nombre,
          apellido_paterno: item.apellido_paterno,
          apellido_materno: item.apellido_materno || '',
          grado: item.grado,
          grupo: item.grupo,
          carrera: item.carrera || 'Licenciatura UNRC',
          carrera_id: item.carrera_id,
          grupo_id: item.grupo_id,
          sede_id: item.sede_id,
          sede_nombre: item.sede_nombre,
          ciclo_id: item.ciclo_id,
          estado_matricula: item.estado_matricula || 'activo',
          tutor: item.tutor || 'Tutor Registrado',
          telefono: item.telefono || '+525500000000',
          foto_url: item.foto_url,
          qr_code: item.qr_code || item.matricula,
          password: item.password
        }));

        await supabase
          .from('alumnos')
          .upsert(supabasePayload, { onConflict: 'matricula' });
      } catch (e) {
        console.warn('Supabase bulk upsert notice:', e);
      }
    }

    await db.addAuditoria(
      'CARGA_MASIVA_ALUMNOS',
      'Servicios Escolares / Matrículas',
      `Carga masiva procesada: ${addedCount} expedientes nuevos incorporados, ${updatedCount} expedientes actualizados. Total procesados: ${processedItems.length}`,
      'Control Escolar / Administrador'
    );

    return { added: addedCount, updated: updatedCount, items: processedItems };
  },

  reassignAlumnosCarrera: async (matriculas: string[], targetCarreraId: string): Promise<number> => {
    initLocalStorage();
    const list = await db.getAlumnos();
    const targetCarrera = (await db.getCarreras()).find(c => c.id === targetCarreraId);
    if (!targetCarrera) return 0;

    let count = 0;
    const matriculaSet = new Set(matriculas.map(m => m.trim().toLowerCase()));

    for (const al of list) {
      if (matriculaSet.has((al.matricula || '').trim().toLowerCase())) {
        al.carrera = targetCarrera.nombre;
        al.carrera_id = targetCarrera.id;
        if (targetCarrera.nombre.toLowerCase().includes('turismo')) {
          al.grupo = '201-TUR';
          al.tutor = 'Dr. Adrian Silva';
        }
        count++;
      }
    }

    if (count > 0) {
      localStorage.setItem('unrc_alumnos', JSON.stringify(list));
      if (supabase) {
        try {
          await supabase
            .from('alumnos')
            .update({
              carrera: targetCarrera.nombre,
              carrera_id: targetCarrera.id
            })
            .in('matricula', matriculas);
        } catch (e) {
          console.warn('Supabase reassign notice:', e);
        }
      }
      await db.addAuditoria(
        'REASIGNACION_CARRERA',
        'Servicios Escolares / Matrículas',
        `Se reasignaron ${count} alumnos a la carrera: ${targetCarrera.nombre}`,
        'Control Escolar'
      );
    }
    return count;
  },

  deleteAlumno: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getAlumnos();
    const target = list.find(a => a.id === id || a.matricula === id);
    const targetMatricula = target ? target.matricula : id;
    list = list.filter(a => a.id !== id && a.matricula !== id);
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('alumnos').delete().eq('matricula', targetMatricula);
      } catch (e) {
        console.warn('Supabase delete notice:', e);
      }
    }
    return true;
  },

  updateAlumno: async (id: string, updates: Partial<Alumno>): Promise<Alumno | null> => {
    initLocalStorage();
    let list = await db.getAlumnos();
    const index = list.findIndex(a => a.id === id || a.matricula === id);
    if (index === -1) return null;

    list[index] = { ...list[index], ...updates };
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));

    if (supabase) {
      try {
        const supabasePayload: Record<string, any> = {};
        if (updates.matricula !== undefined) supabasePayload.matricula = updates.matricula;
        if (updates.nombre !== undefined) supabasePayload.nombre = updates.nombre;
        if (updates.apellido_paterno !== undefined) supabasePayload.apellido_paterno = updates.apellido_paterno;
        if (updates.apellido_materno !== undefined) supabasePayload.apellido_materno = updates.apellido_materno;
        if (updates.grado !== undefined) supabasePayload.grado = updates.grado;
        if (updates.grupo !== undefined) supabasePayload.grupo = updates.grupo;
        if (updates.carrera !== undefined) supabasePayload.carrera = updates.carrera;
        if (updates.tutor !== undefined) supabasePayload.tutor = updates.tutor;
        if (updates.telefono !== undefined) supabasePayload.telefono = updates.telefono;
        if (updates.carrera_id !== undefined) supabasePayload.carrera_id = updates.carrera_id;
        if (updates.grupo_id !== undefined) supabasePayload.grupo_id = updates.grupo_id;

        if (Object.keys(supabasePayload).length > 0) {
          await supabase.from('alumnos').update(supabasePayload).eq('matricula', list[index].matricula);
        }
      } catch (e) {
        console.warn('Supabase update alumno notice:', e);
      }
    }

    return list[index];
  },

  updateAlumnoMatricula: async (id: string, updates: Partial<Alumno>): Promise<Alumno | null> => {
    const updated = await db.updateAlumno(id, updates);
    if (updated) {
      await db.addAuditoria(
        'ACTUALIZACION_MATRICULA',
        'Servicios Escolares / Matrículas',
        `Expediente de matrícula ${updated.matricula} (${updated.nombre} ${updated.apellido_paterno}) actualizado: Estado ${updated.estado_matricula || 'activo'}, Grupo ${updated.grupo}`,
        'Control Escolar'
      );
    }
    return updated;
  },

  // Asistencia operations
  getAsistencias: async (): Promise<Asistencia[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_asistencias');
    const list: Asistencia[] = raw ? JSON.parse(raw) : [];
    const alumnos = await db.getAlumnos();
    
    const enriched = list.map(item => ({
      ...item,
      alumno: alumnos.find(al => al.id === item.alumno_id || al.matricula === item.alumno_id)
    }));
    
    return enriched.sort((a, b) => new Date(b.created_at || b.fecha || '').getTime() - new Date(a.created_at || a.fecha || '').getTime());
  },

  registrarAsistencia: async (
    matricula: string,
    tipoOverride?: 'entrada' | 'salida',
    dispositivo = 'Escáner UNRC',
    ubicacion = 'Acceso Principal',
    escaneadoPor = 'Docente / Sistema'
  ): Promise<{ asistencia: Asistencia; alumno: Alumno; duplicateWarning: boolean }> => {
    const alumno = await db.getAlumnoByQR(matricula);
    if (!alumno) {
      throw new Error(`Estudiante con matrícula/QR '${matricula}' no registrado en UNRC.`);
    }

    const todayStr = getTijuanaDateString();
    const timeStr = getTijuanaTimeString();

    const allAsistencias = await db.getAsistencias();
    const todayLogs = allAsistencias.filter(
      log => (log.alumno_id === alumno.id || log.alumno_id === alumno.matricula) && log.fecha === todayStr
    );

    const now = new Date();
    const duplicateWarning = todayLogs.some(log => {
      const logTime = new Date(`${log.fecha}T${log.hora}`);
      return Math.abs(now.getTime() - logTime.getTime()) < 30000;
    });

    let tipo: 'entrada' | 'salida' = 'entrada';
    if (tipoOverride) {
      tipo = tipoOverride;
    } else if (todayLogs.length > 0) {
      const lastLog = todayLogs[0];
      tipo = lastLog.tipo === 'entrada' ? 'salida' : 'entrada';
    }

    const list = JSON.parse(localStorage.getItem('unrc_asistencias') || '[]');
    const asistenciaData: Asistencia = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      alumno_id: alumno.id,
      grupo_id: alumno.grupo_id,
      tipo,
      estado: 'A',
      fecha: todayStr,
      hora: timeStr,
      dispositivo,
      ubicacion,
      escaneado_por: escaneadoPor,
      created_at: new Date().toISOString(),
      alumno
    };
    list.push(asistenciaData);
    localStorage.setItem('unrc_asistencias', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('asistencias').insert([
          {
            alumno_id: alumno.id,
            grupo_id: alumno.grupo_id,
            tipo,
            estado: 'A',
            fecha: todayStr,
            hora: timeStr,
            dispositivo,
            ubicacion,
            escaneado_por: escaneadoPor
          }
        ]);
      } catch (e) {
        console.warn('Supabase asistencia insert notice:', e);
      }
    }

    return { asistencia: asistenciaData, alumno, duplicateWarning };
  },

  registrarAsistenciasLote: async (
    registros: Array<{
      alumno_id: string;
      estado: EstadoAsistencia;
      fecha: string;
      curso_id?: string;
      materia?: string;
      observaciones?: string;
    }>
  ): Promise<number> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_asistencias');
    let list: Asistencia[] = raw ? JSON.parse(raw) : [];
    const alumnos = await db.getAlumnos();
    const timeStr = new Date().toTimeString().split(' ')[0];

    registros.forEach(r => {
      const alumno = alumnos.find(al => al.id === r.alumno_id || al.matricula === r.alumno_id);
      list = list.filter(item => !(item.alumno_id === r.alumno_id && item.fecha === r.fecha && item.grupo_id === r.curso_id));
      list.push({
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alumno_id: r.alumno_id,
        grupo_id: r.curso_id || alumno?.grupo_id,
        tipo: 'entrada',
        estado: r.estado,
        fecha: r.fecha,
        hora: timeStr,
        dispositivo: 'Consola Docente UNRC',
        ubicacion: 'Aula de Clases',
        escaneado_por: 'Docente Titular / Superadmin',
        observaciones: r.observaciones,
        created_at: new Date().toISOString(),
        alumno
      });
    });

    localStorage.setItem('unrc_asistencias', JSON.stringify(list));
    return registros.length;
  },

  // Participaciones Operations
  getParticipaciones: async (): Promise<Participacion[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_participaciones');
    const list: Participacion[] = raw ? JSON.parse(raw) : [];
    const alumnos = await db.getAlumnos();
    
    return list.map(item => ({
      ...item,
      alumno: alumnos.find(al => al.id === item.alumno_id || al.matricula === item.alumno_id)
    }));
  },

  registrarParticipacion: async (
    alumnoId: string,
    tipo: 'AP' | 'RP' | 'REGULAR',
    observaciones?: string
  ): Promise<Participacion> => {
    initLocalStorage();
    const alumnos = await db.getAlumnos();
    const alumno = alumnos.find(a => a.id === alumnoId || a.matricula === alumnoId);
    if (!alumno) throw new Error('Alumno no encontrado');

    const puntos = tipo === 'AP' ? 10 : (tipo === 'RP' ? 5 : 7.5);
    const newPart: Participacion = {
      id: `part-${Date.now()}`,
      alumno_id: alumno.id,
      grupo_id: alumno.grupo_id,
      fecha: getTijuanaDateString(),
      tipo,
      puntos,
      observaciones: observaciones || (tipo === 'AP' ? 'Aprobada: Excelente aportación' : 'Requerido: Por mejorar'),
      created_at: new Date().toISOString(),
      alumno
    };

    const list: Participacion[] = JSON.parse(localStorage.getItem('unrc_participaciones') || '[]');
    list.push(newPart);
    localStorage.setItem('unrc_participaciones', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('participaciones').insert([{
          alumno_id: alumno.id,
          grupo_id: alumno.grupo_id,
          fecha: newPart.fecha,
          tipo,
          puntos,
          observaciones: newPart.observaciones
        }]);
      } catch (e) {
        console.warn('Supabase participacion insert notice:', e);
      }
    }

    return newPart;
  },

  // Resumen Académico Calculation
  getResumenAcademico: async (grupoClave?: string): Promise<ResumenAcademico[]> => {
    const alumnos = await db.getAlumnos();
    const asistencias = await db.getAsistencias();
    const participaciones = await db.getParticipaciones();
    const carreras = await db.getCarreras();
    const materias = await db.getMaterias();
    const grupos = await db.getGrupos();

    const filtered = grupoClave && grupoClave !== 'todos'
      ? alumnos.filter(al => al.grupo === grupoClave || al.grupo_id === grupoClave)
      : alumnos;

    return filtered.map(al => {
      const grupoObj = grupos.find(g => g.clave_grupo === al.grupo || g.id === al.grupo_id);
      const materiaObj = materias.find(m => m.id === grupoObj?.materia_id);
      const carreraObj = carreras.find(c => c.id === al.carrera_id);

      const alAsistencias = asistencias.filter(a => a.alumno_id === al.id || a.alumno?.id === al.id);
      const isTurismo = al.grupo === '201-TUR' || al.grupo_id === 'g201-tur' || (al.carrera && al.carrera.toLowerCase().includes('turismo'));
      // Turismo has 2 scheduled classes per week (Wednesdays & Saturdays) -> 4 sessions in evaluated period
      // Other groups have classes Mon-Sat -> 8 sessions in evaluated period
      const expectedSessions = isTurismo ? 4 : 8;
      const totalSesiones = Math.max(alAsistencias.length, expectedSessions);
      const sesionScoreSum = alAsistencias.reduce((acc, curr) => {
        if (curr.estado === 'A' || curr.estado === 'J') return acc + 1.0;
        if (curr.estado === 'R') return acc + 0.75;
        return acc;
      }, 0);
      const porcentajeAsistencia = Number(Math.min(100, Number(((sesionScoreSum / totalSesiones) * 100).toFixed(2))));

      const alParticipaciones = participaciones.filter(p => p.alumno_id === al.id || p.alumno?.id === al.id);
      const promedioPart = alParticipaciones.length > 0
        ? Number((alParticipaciones.reduce((acc, curr) => acc + curr.puntos, 0) / alParticipaciones.length).toFixed(2))
        : 10.0;

      const promedioTareas = 10.0;
      const promedioProyectos = 10.0;
      const autoevaluacion = 10.0;

      // Final Grade Formula: Asistencia 20%, Participación 20%, Tareas 20%, Proyectos 25%, Autoevaluación 15%
      const calificacionFinal = Number((
        (porcentajeAsistencia / 100 * 2.0) +
        (promedioPart / 10 * 2.0) +
        (promedioTareas / 10 * 2.0) +
        (promedioProyectos / 10 * 2.5) +
        (autoevaluacion / 10 * 1.5)
      ).toFixed(2));

      return {
        alumno_id: al.id,
        matricula: al.matricula,
        nombre_completo: `${al.nombre} ${al.apellido_paterno} ${al.apellido_materno || ''}`.trim(),
        carrera: carreraObj?.nombre || al.carrera || 'Licenciatura UNRC',
        materia: materiaObj?.nombre || 'Materia UNRC',
        grupo: al.grupo,
        porcentaje_asistencia: porcentajeAsistencia,
        promedio_participacion: promedioPart,
        promedio_tareas: promedioTareas,
        promedio_proyectos: promedioProyectos,
        autoevaluacion: autoevaluacion,
        calificacion_final: calificacionFinal
      };
    });
  },

  // Docentes operations
  getDocentes: async (): Promise<Docente[]> => {
    if (typeof window === 'undefined') return MOCK_DOCENTES;
    initLocalStorage();
    const raw = localStorage.getItem('unrc_docentes');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If any docente is missing schedule or password, assign them
          let hadChanges = false;
          const enriched = parsed.map((d: Docente) => {
            const isValdez = d.num_empleado === 'DOC-UNRC-01' || d.id === 'a1111111-1111-1111-1111-111111111111' || d.email?.includes('valdez') || d.apellido_paterno?.includes('Valdez');
            const isSanchez = d.num_empleado === 'DOC-UNRC-02' || d.id === 'b2222222-2222-2222-2222-222222222222' || d.email?.includes('sanchez') || d.apellido_paterno?.includes('Sánchez');
            const isSilva = d.num_empleado === 'DOC-UNRC-03' || d.id === 'd0000003-0000-0000-0000-000000000003' || d.email?.includes('silva') || d.apellido_paterno?.includes('Silva');

            let updated = { ...d };
            if (!updated.password) {
              hadChanges = true;
              updated.password = getDefaultUserPassword(d.num_empleado, '2026-2');
            }

            if (!d.horarios || d.horarios.length === 0 || d.horario_resumen === 'Por programar' || d.horario_resumen === 'Por asignar') {
              hadChanges = true;
              if (isValdez) {
                return {
                  ...updated,
                  carreras_asignadas: (d.carreras_asignadas && d.carreras_asignadas.length > 0) ? d.carreras_asignadas : ['Lic. en Ciencias de Datos e Inteligencia Artificial', 'Licenciatura en Ciencia de Datos para los Negocios'],
                  materias: (d.materias && d.materias.length > 0) ? d.materias : ['Programación Web y Bases de Datos', 'Inteligencia Artificial y Aprendizaje Automático', 'Minería de Datos y Modelado Predictivo'],
                  horario_resumen: 'Lunes a Sábado (07:00 - 13:00 hrs)',
                  horarios: [
                    { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '10:00', carrera: 'Lic. en Ciencias de Datos e Inteligencia Artificial', materia: 'Programación Web y Bases de Datos', grupo: '101', aula: 'Edificio B - Aula 101', es_en_linea: false },
                    { dia: 'Miércoles', hora_inicio: '07:00', hora_fin: '10:00', carrera: 'Lic. en Ciencias de Datos e Inteligencia Artificial', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '102', aula: 'Edificio B - Aula 102', es_en_linea: false },
                    { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '401-LCDN', aula: 'Laboratorio de Cómputo e IA', es_en_linea: false },
                    { dia: 'Lunes', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Programación Web y Bases de Datos', grupo: '401-LCDN', aula: 'Laboratorio de Cómputo e IA', es_en_linea: false },
                    { dia: 'Viernes', hora_inicio: '08:00', hora_fin: '11:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Minería de Datos y Modelado Predictivo', grupo: '401-LCDN', aula: 'Aula Virtual UNRC (Google Meet)', es_en_linea: true }
                  ],
                  sede_nombre: d.sede_nombre || 'Campus Magdalena Contreras'
                };
              }
              if (isSanchez) {
                return {
                  ...updated,
                  carreras_asignadas: (d.carreras_asignadas && d.carreras_asignadas.length > 0) ? d.carreras_asignadas : ['Inteligencia Artificial', 'Lic. en Tecnologías de la Información y Comunicación'],
                  materias: (d.materias && d.materias.length > 0) ? d.materias : ['Redes Neuronales', 'Algoritmos Complejos', 'Estructura de Datos y Algoritmos'],
                  horario_resumen: 'Lunes a Sábado (14:00 - 20:00 hrs)',
                  horarios: [
                    { dia: 'Martes', hora_inicio: '14:00', hora_fin: '17:00', carrera: 'Lic. en Tecnologías de la Información y Comunicación', materia: 'Estructura de Datos y Algoritmos', grupo: '201', aula: 'Laboratorio de Cómputo 1' },
                    { dia: 'Jueves', hora_inicio: '14:00', hora_fin: '17:00', carrera: 'Lic. en Tecnologías de la Información y Comunicación', materia: 'Ingeniería de Software y Sistemas Web', grupo: '301', aula: 'Laboratorio Redes 2' }
                  ],
                  sede_nombre: d.sede_nombre || 'Campus Magdalena Contreras'
                };
              }
              if (isSilva) {
                return {
                  ...updated,
                  carreras_asignadas: (d.carreras_asignadas && d.carreras_asignadas.length > 0) ? d.carreras_asignadas : ['Licenciatura en Administración', 'Licenciatura en Turismo'],
                  materias: (d.materias && d.materias.length > 0) ? d.materias : ['Administración de Empresas de Hospedaje', 'Matemáticas para la Administración'],
                  horario_resumen: 'Miércoles (09:00 - 11:00 hrs) y Sábados (07:00 - 09:00 hrs)',
                  horarios: [
                    { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '11:00', carrera: 'Licenciatura en Turismo', materia: 'Administración de Empresas de Hospedaje', grupo: '201-TUR', aula: 'Edificio A - Aula Magna 2' },
                    { dia: 'Sábado', hora_inicio: '07:00', hora_fin: '09:00', carrera: 'Licenciatura en Turismo', materia: 'Administración de Empresas de Hospedaje', grupo: '201-TUR', aula: 'Edificio A - Aula Magna 2' },
                    { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '09:00', carrera: 'Licenciatura en Administración', materia: 'Matemáticas para la Administración', grupo: '203-ADM', aula: 'Edificio C - Aula 203' }
                  ],
                  sede_nombre: d.sede_nombre || 'Campus Magdalena Contreras'
                };
              }
            }

            if (isValdez) {
              const has401 = updated.horarios?.some((h: HorarioDocenteItem) => h.grupo === '401-LCDN' || h.grupo === '401');
              if (!has401) {
                hadChanges = true;
                const existing = updated.horarios || [];
                updated.carreras_asignadas = Array.from(new Set([...(updated.carreras_asignadas || []), 'Licenciatura en Ciencia de Datos para los Negocios', 'Lic. en Ciencias de Datos e Inteligencia Artificial']));
                updated.materias = Array.from(new Set([...(updated.materias || []), 'Inteligencia Artificial y Aprendizaje Automático', 'Programación Web y Bases de Datos', 'Minería de Datos y Modelado Predictivo']));
                updated.horarios = [
                  ...existing,
                  { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '401-LCDN', aula: 'Laboratorio de Cómputo e IA', es_en_linea: false },
                  { dia: 'Lunes', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Programación Web y Bases de Datos', grupo: '401-LCDN', aula: 'Laboratorio de Cómputo e IA', es_en_linea: false },
                  { dia: 'Viernes', hora_inicio: '08:00', hora_fin: '11:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Minería de Datos y Modelado Predictivo', grupo: '401-LCDN', aula: 'Aula Virtual UNRC (Google Meet)', es_en_linea: true }
                ];
              }
            }

            return updated;
          });

          if (hadChanges) {
            localStorage.setItem('unrc_docentes', JSON.stringify(enriched));
          }
          return enriched;
        }
      } catch (e) {
        console.warn('Error parsing unrc_docentes:', e);
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('docentes')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (!error && data && data.length > 0) {
          const list: Docente[] = data.map((sd: any) => {
            const mockMatch = MOCK_DOCENTES.find(m => m.num_empleado === sd.num_empleado || m.email === sd.email);
            return {
              ...mockMatch,
              ...sd,
              password: sd.password || mockMatch?.password || getDefaultUserPassword(sd.num_empleado, '2026-2'),
              carreras_asignadas: sd.carreras_asignadas || mockMatch?.carreras_asignadas || [sd.departamento || 'Licenciatura'],
              materias: sd.materias || mockMatch?.materias || [],
              horario_resumen: sd.horario_resumen || mockMatch?.horario_resumen || 'Por programar',
              horarios: sd.horarios || mockMatch?.horarios || [],
              sede_nombre: sd.sede_nombre || mockMatch?.sede_nombre || 'Campus Magdalena Contreras'
            };
          });
          localStorage.setItem('unrc_docentes', JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn('Docentes fetch fallback:', err);
      }
    }

    const seeded = MOCK_DOCENTES.map(d => ({
      ...d,
      password: d.password || getDefaultUserPassword(d.num_empleado, '2026-2')
    }));
    localStorage.setItem('unrc_docentes', JSON.stringify(seeded));
    return seeded;
  },

  addDocentesBulk: async (docentes: Omit<Docente, 'id' | 'created_at'>[]): Promise<Docente[]> => {
    initLocalStorage();
    const current = await db.getDocentes();
    const newItems: Docente[] = [];

    docentes.forEach((doc, idx) => {
      const item: Docente = {
        ...doc,
        password: doc.password || getDefaultUserPassword(doc.num_empleado, '2026-2'),
        id: `docente-${Date.now()}-${idx}`,
        created_at: new Date().toISOString()
      };
      newItems.push(item);
      current.push(item);
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(current));
    }
    return newItems;
  },

  addDocente: async (docente: Omit<Docente, 'id' | 'created_at'>): Promise<Docente> => {
    initLocalStorage();
    const list = await db.getDocentes();
    const newDoc: Docente = {
      ...docente,
      password: docente.password || getDefaultUserPassword(docente.num_empleado, '2026-2'),
      id: `docente-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const supabasePayload = {
          num_empleado: newDoc.num_empleado,
          nombre: newDoc.nombre,
          apellido_paterno: newDoc.apellido_paterno,
          apellido_materno: newDoc.apellido_materno,
          email: newDoc.email,
          departamento: newDoc.departamento,
          materias: newDoc.materias,
          telefono: newDoc.telefono
        };
        await supabase.from('docentes').insert([supabasePayload]);
      } catch (e) {
        console.warn('Supabase docente insert:', e);
      }
    }

    list.push(newDoc);
    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(list));
    }
    await db.addAuditoria('ALTA_DOCENTE', 'Recursos Humanos / Personal', `Se registró al docente ${newDoc.nombre} ${newDoc.apellido_paterno} (${newDoc.num_empleado})`, 'Administrador');
    return newDoc;
  },

  updateDocente: async (id: string, updates: Partial<Docente>): Promise<Docente | null> => {
    initLocalStorage();
    let list = await db.getDocentes();
    let index = list.findIndex(d =>
      d.id === id ||
      d.num_empleado === id ||
      (updates.num_empleado && d.num_empleado === updates.num_empleado) ||
      (updates.email && d.email?.toLowerCase() === updates.email.toLowerCase()) ||
      (id.includes('01') && (d.num_empleado === 'DOC-UNRC-01' || d.id === 'docente-1' || d.id === 'a1111111-1111-1111-1111-111111111111')) ||
      (id.includes('02') && (d.num_empleado === 'DOC-UNRC-02' || d.id === 'docente-2' || d.id === 'b2222222-2222-2222-2222-222222222222')) ||
      (id.includes('03') && (d.num_empleado === 'DOC-UNRC-03' || d.id === 'docente-3' || d.id === 'd0000003-0000-0000-0000-000000000003'))
    );

    if (index === -1) {
      const newDoc: Docente = {
        id: id || `docente-${Date.now()}`,
        num_empleado: updates.num_empleado || 'DOC-UNRC-99',
        nombre: updates.nombre || 'Docente',
        apellido_paterno: updates.apellido_paterno || 'UNRC',
        apellido_materno: updates.apellido_materno || '',
        email: updates.email || 'docente@rcastellanos.cdmx.gob.mx',
        departamento: updates.departamento || 'Licenciatura',
        puesto: updates.puesto || 'docente',
        telefono: updates.telefono || '',
        sede_nombre: updates.sede_nombre || 'Campus Magdalena Contreras',
        materias: updates.materias || [],
        carreras_asignadas: updates.carreras_asignadas || [updates.departamento || 'Licenciatura'],
        horario_resumen: updates.horario_resumen || 'Por programar',
        horarios: updates.horarios || [],
        ...updates
      };
      list.push(newDoc);
      index = list.length - 1;
    }

    list[index] = { ...list[index], ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(list));
    }

    if (supabase) {
      try {
        const supabasePayload: Record<string, any> = {};
        if (updates.num_empleado !== undefined) supabasePayload.num_empleado = updates.num_empleado;
        if (updates.nombre !== undefined) supabasePayload.nombre = updates.nombre;
        if (updates.apellido_paterno !== undefined) supabasePayload.apellido_paterno = updates.apellido_paterno;
        if (updates.apellido_materno !== undefined) supabasePayload.apellido_materno = updates.apellido_materno;
        if (updates.email !== undefined) supabasePayload.email = updates.email;
        if (updates.departamento !== undefined) supabasePayload.departamento = updates.departamento;
        if (updates.materias !== undefined) supabasePayload.materias = updates.materias;
        if (updates.telefono !== undefined) supabasePayload.telefono = updates.telefono;

        if (Object.keys(supabasePayload).length > 0) {
          await supabase
            .from('docentes')
            .update(supabasePayload)
            .eq('num_empleado', list[index].num_empleado);
        }
      } catch (e) {
        console.warn('Supabase docente update:', e);
      }
    }
    await db.addAuditoria('MODIFICACION_DOCENTE', 'Recursos Humanos / Personal', `Actualización de datos del docente ${list[index].nombre} ${list[index].apellido_paterno}`, 'Administrador');
    return list[index];
  },

  deleteDocente: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getDocentes();
    const target = list.find(d => d.id === id || d.num_empleado === id);
    const targetNum = target ? target.num_empleado : id;
    list = list.filter(d => d.id !== id && d.num_empleado !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(list));
    }

    if (supabase) {
      try {
        await supabase.from('docentes').delete().eq('num_empleado', targetNum);
      } catch (e) {
        console.warn('Supabase docente delete notice:', e);
      }
    }
    if (target) {
      await db.addAuditoria('BAJA_DOCENTE', 'Recursos Humanos / Personal', `Se eliminó el expediente docente de ${target.nombre} ${target.apellido_paterno}`, 'Administrador');
    }
    return true;
  },

  // Auditoria operations
  getAuditorias: async (): Promise<AuditoriaLog[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_auditorias');
    const list: AuditoriaLog[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  },

  addAuditoria: async (accion: string, modulo: string, detalle: string, usuario = 'Super Admin'): Promise<AuditoriaLog> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_auditorias');
    const list: AuditoriaLog[] = raw ? JSON.parse(raw) : [];
    const newLog: AuditoriaLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      accion,
      modulo,
      detalle,
      usuario,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    list.unshift(newLog);
    localStorage.setItem('unrc_auditorias', JSON.stringify(list.slice(0, 100)));
    return newLog;
  },

  // Anuncios operations
  getAnuncios: async (): Promise<AnuncioInstitucional[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_anuncios');
    const list: AnuncioInstitucional[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  },

  addAnuncio: async (anuncio: Omit<AnuncioInstitucional, 'id' | 'fecha'>): Promise<AnuncioInstitucional> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_anuncios');
    const list: AnuncioInstitucional[] = raw ? JSON.parse(raw) : [];
    const newAnuncio: AnuncioInstitucional = {
      ...anuncio,
      id: `anu-${Date.now()}`,
      fecha: getTijuanaDateString()
    };
    list.unshift(newAnuncio);
    localStorage.setItem('unrc_anuncios', JSON.stringify(list));
    await db.addAuditoria('PUBLICACION_ANUNCIO', 'Comunicados Globales', `Nuevo comunicado publicado: "${newAnuncio.titulo}" (${newAnuncio.audiencia})`, anuncio.autor || 'Rectoría');
    return newAnuncio;
  },

  deleteAnuncio: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getAnuncios();
    list = list.filter(a => a.id !== id);
    localStorage.setItem('unrc_anuncios', JSON.stringify(list));
    return true;
  },

  syncToSupabase: async (
    data: { alumnos?: Alumno[]; docentes?: Docente[] },
    targetSupabaseUrl?: string,
    targetSupabaseKey?: string
  ): Promise<{ success: boolean; alumnosSynced: number; docentesSynced: number; logs: string[] }> => {
    const logs: string[] = [];
    let alumnosCount = 0;
    let docentesCount = 0;

    const activeClient = (targetSupabaseUrl && targetSupabaseKey)
      ? createClient(targetSupabaseUrl, targetSupabaseKey)
      : supabase;

    if (!activeClient) {
      logs.push('⚠️ No se ha proporcionado cliente de servidor. Los datos se sincronizaron en almacenamiento local.');
      if (data.alumnos && data.alumnos.length > 0) {
        await db.addAlumnosBulk(data.alumnos);
        alumnosCount = data.alumnos.length;
        logs.push(`✅ ${alumnosCount} alumnos cargados localmente en Sandbox.`);
      }
      if (data.docentes && data.docentes.length > 0) {
        await db.addDocentesBulk(data.docentes);
        docentesCount = data.docentes.length;
        logs.push(`✅ ${docentesCount} docentes cargados localmente en Sandbox.`);
      }
      return { success: true, alumnosSynced: alumnosCount, docentesSynced: docentesCount, logs };
    }

    try {
      logs.push('🔗 Conectando con servidor de datos...');

      if (data.alumnos && data.alumnos.length > 0) {
        logs.push(`📤 Insertando/actualizando ${data.alumnos.length} registros en tabla 'alumnos'...`);
        const { data: inserted, error } = await activeClient
          .from('alumnos')
          .upsert(
            data.alumnos.map(a => ({
              matricula: a.matricula,
              nombre: a.nombre,
              apellido_paterno: a.apellido_paterno,
              apellido_materno: a.apellido_materno || '',
              grado: a.grado,
              grupo: a.grupo,
              carrera: a.carrera || 'Universidad Rosario Castellanos',
              tutor: a.tutor || 'Tutor Registrado',
              telefono: a.telefono || '+525500000000',
              foto_url: a.foto_url,
              qr_code: a.qr_code || a.matricula
            })),
            { onConflict: 'matricula' }
          )
          .select();

        if (error) {
          logs.push(`❌ Error en tabla 'alumnos': ${error.message}`);
        } else {
          alumnosCount = inserted?.length || data.alumnos.length;
          logs.push(`✅ ${alumnosCount} alumnos sincronizados con éxito en la Base de Datos.`);
        }
      }

      if (data.docentes && data.docentes.length > 0) {
        logs.push(`📤 Insertando/actualizando ${data.docentes.length} registros en tabla 'docentes'...`);
        const { data: insertedDoc, error: docError } = await activeClient
          .from('docentes')
          .upsert(
            data.docentes.map(d => ({
              num_empleado: d.num_empleado,
              nombre: d.nombre,
              apellido_paterno: d.apellido_paterno,
              apellido_materno: d.apellido_materno || '',
              email: d.email,
              departamento: d.departamento || 'Licenciaturas UNRC',
              materias: d.materias || ['Computación'],
              telefono: d.telefono || '+525500000000',
              foto_url: d.foto_url
            })),
            { onConflict: 'num_empleado' }
          )
          .select();

        if (docError) {
          logs.push(`❌ Error en tabla 'docentes': ${docError.message}`);
        } else {
          docentesCount = insertedDoc?.length || data.docentes.length;
          logs.push(`✅ ${docentesCount} docentes sincronizados con éxito en la Base de Datos.`);
        }
      }

      if (data.alumnos) await db.addAlumnosBulk(data.alumnos);
      if (data.docentes) await db.addDocentesBulk(data.docentes);

      logs.push('🎉 Proceso de sincronización finalizado.');
      return { success: true, alumnosSynced: alumnosCount, docentesSynced: docentesCount, logs };
    } catch (err: any) {
      logs.push(`❌ Excepción al conectar con el servidor: ${err.message || err}`);
      return { success: false, alumnosSynced: 0, docentesSynced: 0, logs };
    }
  },

  clearDatabase: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('unrc_alumnos');
    localStorage.removeItem('unrc_docentes');
    localStorage.removeItem('unrc_asistencias');
    localStorage.removeItem('unrc_participaciones');
    localStorage.removeItem('unrc_carreras');
    localStorage.removeItem('unrc_materias');
    localStorage.removeItem('unrc_grupos');
    initLocalStorage();
  }
};
