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
  sede?: string;
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
  docente_nombre?: string;
  docente_id?: string;
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
  curso_id?: string;
  materia?: string;
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
  { id: 'sede-tij', clave: 'UNRC-TIJ', nombre: 'Campus Tijuana', direccion: 'Blvd. Bellas Artes, Otay, Tijuana, B.C.', director: 'Dr. Adrian Silva', telefono: '+526641234567', capacidad: 1500, activa: true },
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
  { id: 'sec-101', nombre: '101', grado_id: 'g-sem-1', grado_nombre: '1° Semestre', carrera_id: 'c1111111-1111-1111-1111-111111111111', carrera_nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Aula 101', cupo_maximo: 35 },
  { id: 'sec-102', nombre: '102', grado_id: 'g-sem-1', grado_nombre: '1° Semestre', carrera_id: 'c1111111-1111-1111-1111-111111111111', carrera_nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Aula 102', cupo_maximo: 35 },
  { id: 'sec-201-tur', nombre: '201-TUR', grado_id: 'g-sem-2', grado_nombre: '2° Semestre', carrera_id: 'c4444444-4444-4444-4444-444444444444', carrera_nombre: 'Licenciatura en Turismo', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Aula Magna TIJ', cupo_maximo: 30 },
  { id: 'sec-203-adm', nombre: '203-ADM', grado_id: 'g-sem-2', grado_nombre: '2° Semestre', carrera_id: 'c5555555-5555-5555-5555-555555555555', carrera_nombre: 'Licenciatura en Administración', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Aula 203', cupo_maximo: 40 },
  { id: 'sec-203-tij', nombre: 'PHLAC-203-TIJ', grado_id: 'g-sem-2', grado_nombre: '2° Semestre', carrera_id: 'c5555555-5555-5555-5555-555555555555', carrera_nombre: 'Licenciatura en Administración', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Aula 203', cupo_maximo: 40 },
  { id: 'sec-201', nombre: '201', grado_id: 'g-sem-3', grado_nombre: '3° Semestre', carrera_id: 'c2222222-2222-2222-2222-222222222222', carrera_nombre: 'Licenciatura en Tecnologías de la Información y Comunicación', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Vespertino', aula: 'Campus Tijuana - Lab Cómputo 1', cupo_maximo: 30 },
  { id: 'sec-301', nombre: '301', grado_id: 'g-sem-3', grado_nombre: '3° Semestre', carrera_id: 'c2222222-2222-2222-2222-222222222222', carrera_nombre: 'Licenciatura en Tecnologías de la Información y Comunicación', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Lab Redes', cupo_maximo: 30 },
  { id: 'sec-401-lcdn', nombre: '401-LCDN', grado_id: 'g-sem-4', grado_nombre: '4° Semestre', carrera_id: 'c1111111-1111-1111-1111-111111111111', carrera_nombre: 'Licenciatura en Ciencia de Datos para los Negocios', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Lab IA', cupo_maximo: 35 },
  { id: 'sec-501', nombre: '501', grado_id: 'g-sem-5', grado_nombre: '5° Semestre', carrera_id: 'c3333333-3333-3333-3333-333333333333', carrera_nombre: 'Licenciatura en Ciberseguridad', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', aula: 'Campus Tijuana - Lab Ciberseguridad', cupo_maximo: 25 }
];

const MOCK_CARRERAS: Carrera[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', clave: 'LIC-CDIA', nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', nivel: 'Licenciatura', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana' },
  { id: 'c2222222-2222-2222-2222-222222222222', clave: 'LIC-TIC', nombre: 'Licenciatura en Tecnologías de la Información y Comunicación', nivel: 'Licenciatura', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana' },
  { id: 'c3333333-3333-3333-3333-333333333333', clave: 'LIC-CIB', nombre: 'Licenciatura en Ciberseguridad', nivel: 'Licenciatura', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana' },
  { id: 'c4444444-4444-4444-4444-444444444444', clave: 'LIC-TUR', nombre: 'Licenciatura en Turismo', nivel: 'Licenciatura', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana' },
  { id: 'c5555555-5555-5555-5555-555555555555', clave: 'LIC-ADM', nombre: 'Licenciatura en Administración', nivel: 'Licenciatura', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana' }
];

const MOCK_MATERIAS: Materia[] = [
  { id: 'f7777777-7777-7777-7777-777777777777', carrera_id: 'c5555555-5555-5555-5555-555555555555', clave: 'PHLAC-203-TIJ', nombre: 'Matemáticas para la Administración', creditos: 8, semestre: '2° Semestre', horas_semana: 6 },
  { id: 'f1111111-1111-1111-1111-111111111111', carrera_id: 'c1111111-1111-1111-1111-111111111111', clave: 'PHLCDN-201-TIJ', nombre: 'Programación Web y Bases de Datos', creditos: 8, semestre: '2° Semestre', horas_semana: 6 },
  { id: 'f2222222-2222-2222-2222-222222222222', carrera_id: 'c1111111-1111-1111-1111-111111111111', clave: 'CDIA-102', nombre: 'Inteligencia Artificial y Aprendizaje Automático', creditos: 10, semestre: '1° Semestre', horas_semana: 6 },
  { id: 'f3333333-3333-3333-3333-333333333333', carrera_id: 'c2222222-2222-2222-2222-222222222222', clave: 'TIC-201', nombre: 'Estructura de Datos y Algoritmos', creditos: 8, semestre: '3° Semestre', horas_semana: 6 },
  { id: 'f4444444-4444-4444-4444-444444444444', carrera_id: 'c2222222-2222-2222-2222-222222222222', clave: 'TIC-301', nombre: 'Ingeniería de Software y Sistemas Web', creditos: 10, semestre: '3° Semestre', horas_semana: 6 },
  { id: 'f5555555-5555-5555-5555-555555555555', carrera_id: 'c3333333-3333-3333-3333-333333333333', clave: 'CIB-501', nombre: 'Ciberseguridad y Auditoría de Sistemas', creditos: 10, semestre: '5° Semestre', horas_semana: 6 },
  { id: 'da9f6013-226d-49a1-ba7a-6adfb97a7c35', carrera_id: 'c1111111-1111-1111-1111-111111111111', clave: 'LCDN-401', nombre: 'Bases de Datos NOSQL', creditos: 8, semestre: '4° Semestre', horas_semana: 6 },
  { id: 'f6666666-6666-6666-6666-666666666666', carrera_id: 'c4444444-4444-4444-4444-444444444444', clave: 'TUR-201', nombre: 'Administración de Empresas de Hospedaje', creditos: 8, semestre: '2° Semestre', horas_semana: 4 }
];

const MOCK_GRUPOS: Grupo[] = [
  { id: 'g101', clave_grupo: '101', carrera_id: 'c1', materia_id: 'm1', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Lic. Alejandro Valdez', aula: 'Campus Tijuana - Aula 101' },
  { id: 'g102', clave_grupo: '102', carrera_id: 'c1', materia_id: 'm2', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Lic. Alejandro Valdez', aula: 'Campus Tijuana - Aula 102' },
  { id: 'g201', clave_grupo: '201', carrera_id: 'c2', materia_id: 'm3', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Vespertino', periodo: '2026-2', horario: 'Lunes a Sábado (14:00 - 20:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', aula: 'Campus Tijuana - Lab Cómputo 1' },
  { id: 'g201-tur', clave_grupo: '201-TUR', carrera_id: 'c4', materia_id: 'm6', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Miércoles 09:00 - 11:00 hrs | Sábado 07:00 - 09:00 hrs', dias_clase: ['Miércoles', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', aula: 'Campus Tijuana - Aula Magna TIJ' },
  { id: 'g203-adm', clave_grupo: '203-ADM', carrera_id: 'c5', materia_id: 'm7', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', aula: 'Campus Tijuana - Aula 203' },
  { id: 'g203-tij', clave_grupo: 'PHLAC-203-TIJ', carrera_id: 'c5', materia_id: 'f7777777-7777-7777-7777-777777777777', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes, Miércoles y Viernes (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Miércoles', 'Viernes'], docente_nombre: 'Dr. Adrian Silva', aula: 'Campus Tijuana - Aula 203' },
  { id: 'g301', clave_grupo: '301', carrera_id: 'c2', materia_id: 'm4', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', aula: 'Campus Tijuana - Lab Redes' },
  { id: 'g401-lcdn', clave_grupo: '401-LCDN', carrera_id: 'c1111111-1111-1111-1111-111111111111', materia_id: 'f2222222-2222-2222-2222-222222222222', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Miércoles (09:00 - 11:00 hrs) y Sábados (07:00 - 09:00 hrs)', dias_clase: ['Miércoles', 'Sábado'], docente_nombre: 'Dr. Adrian Silva', docente_id: 'd0000003-0000-0000-0000-000000000003', aula: 'Aula Virtual UNRC (Google Meet)' },
  { id: 'g501', clave_grupo: '501', carrera_id: 'c3', materia_id: 'm5', sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana', turno: 'Matutino', periodo: '2026-2', horario: 'Lunes a Sábado (07:00 - 13:00 hrs)', dias_clase: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], docente_nombre: 'Tutor UNRC', aula: 'Campus Tijuana - Lab Ciberseguridad' }
];

// Initial data for UNRC Alumnos: Empty by default so official imported students and matriculas are respected
const MOCK_ALUMNOS: Alumno[] = [];

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
      { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '10:00', carrera: 'Lic. en Ciencias de Datos e Inteligencia Artificial', materia: 'Programación Web y Bases de Datos', grupo: '101', aula: 'Campus Tijuana - Aula 101', es_en_linea: false },
      { dia: 'Miércoles', hora_inicio: '07:00', hora_fin: '10:00', carrera: 'Lic. en Ciencias de Datos e Inteligencia Artificial', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '102', aula: 'Campus Tijuana - Aula 102', es_en_linea: false },
      { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Inteligencia Artificial y Aprendizaje Automático', grupo: '401-LCDN', aula: 'Campus Tijuana - Lab IA', es_en_linea: false },
      { dia: 'Lunes', hora_inicio: '09:00', hora_fin: '12:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Programación Web y Bases de Datos', grupo: '401-LCDN', aula: 'Campus Tijuana - Lab IA', es_en_linea: false },
      { dia: 'Viernes', hora_inicio: '08:00', hora_fin: '11:00', carrera: 'Licenciatura en Ciencia de Datos para los Negocios', materia: 'Minería de Datos y Modelado Predictivo', grupo: '401-LCDN', aula: 'Aula Virtual UNRC (Google Meet)', es_en_linea: true }
    ],
    sede_nombre: 'Campus Tijuana',
    telefono: '+525599887766',
    foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  },
  {
    id: 'docente-3',
    num_empleado: 'DOC-UNRC-03',
    nombre: 'Adrian',
    apellido_paterno: 'Silva',
    apellido_materno: '',
    email: 'adrian.silva@rcastellanos.cdmx.gob.mx',
    departamento: 'Dirección Campus Tijuana / Lic. en Administración / Lic. en Turismo',
    puesto: 'docente',
    carreras_asignadas: ['Lic. en Administración', 'Lic. en Turismo', 'Licenciatura en Ciencia de Datos para los Negocios'],
    materias: ['Matemáticas para la Administración', 'Administración y Gestión Estratégica', 'Contabilidad y Finanzas Aplicadas', 'Administración de Empresas de Hospedaje', 'Programación para la ciencia de datos'],
    horario_resumen: 'Lunes a Viernes (07:00 - 13:00 hrs)',
    horarios: [
      { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '09:00', carrera: 'Lic. en Administración', materia: 'Matemáticas para la Administración', grupo: 'PHLAC-203-TIJ', aula: 'Campus Tijuana - Aula 203', sede: 'Campus Tijuana', es_en_linea: false },
      { dia: 'Miércoles', hora_inicio: '11:00', hora_fin: '13:00', carrera: 'Lic. en Administración', materia: 'Administración y Gestión Estratégica', grupo: 'PHLAC-203-TIJ', aula: 'Campus Tijuana - Aula Magna TIJ', sede: 'Campus Tijuana', es_en_linea: false },
      { dia: 'Viernes', hora_inicio: '08:00', hora_fin: '10:00', carrera: 'Lic. en Administración', materia: 'Contabilidad y Finanzas Aplicadas', grupo: 'PHLAC-203-TIJ', aula: 'Aula Virtual UNRC (Google Meet)', sede: 'Campus Tijuana', es_en_linea: true },
      { dia: 'Miércoles', hora_inicio: '09:00', hora_fin: '11:00', carrera: 'Lic. en Turismo', materia: 'Administración de Empresas de Hospedaje', grupo: '201-TUR', aula: 'Campus Tijuana - Aula Magna 2', sede: 'Campus Tijuana', es_en_linea: false },
      { dia: 'Sábado', hora_inicio: '07:00', hora_fin: '09:00', carrera: 'Lic. en Turismo', materia: 'Administración de Empresas de Hospedaje', grupo: '201-TUR', aula: 'Aula Virtual UNRC (Google Meet)', sede: 'Campus Tijuana', es_en_linea: true }
    ],
    sede_nombre: 'Campus Tijuana',
    telefono: '+526641234567',
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
    sede_nombre: 'Campus Tijuana',
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
    sede_nombre: 'Campus Tijuana',
    telefono: '+525556830102',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  // Sync core institutional catalogs (Campus Tijuana is the primary campus)
  if (!localStorage.getItem('unrc_sedes') || !localStorage.getItem('unrc_sedes_tij_v1')) {
    localStorage.setItem('unrc_sedes', JSON.stringify(MOCK_SEDES));
    localStorage.setItem('unrc_sedes_tij_v1', 'true');
  }
  if (!localStorage.getItem('unrc_ciclos')) {
    localStorage.setItem('unrc_ciclos', JSON.stringify(MOCK_CICLOS));
  }
  if (!localStorage.getItem('unrc_grados')) {
    localStorage.setItem('unrc_grados', JSON.stringify(MOCK_GRADOS));
  }
  if (!localStorage.getItem('unrc_secciones') || !localStorage.getItem('unrc_secciones_tij_v1')) {
    localStorage.setItem('unrc_secciones', JSON.stringify(MOCK_SECCIONES));
    localStorage.setItem('unrc_secciones_tij_v1', 'true');
  }

  // Institutional catalogs initialized
  if (!localStorage.getItem('unrc_carreras') || !localStorage.getItem('unrc_carreras_tij_v1')) {
    localStorage.setItem('unrc_carreras', JSON.stringify(MOCK_CARRERAS));
    localStorage.setItem('unrc_carreras_tij_v1', 'true');
  }
  if (!localStorage.getItem('unrc_materias') || !localStorage.getItem('unrc_materias_v3_official')) {
    let currentMats: Materia[] = [];
    const raw = localStorage.getItem('unrc_materias');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) currentMats = parsed;
      } catch (e) {}
    }
    if (currentMats.length === 0) {
      currentMats = [...MOCK_MATERIAS];
    } else {
      currentMats = currentMats.map((m) => {
        if (m.clave === 'ADM-203' || m.id === 'f7777777-7777-7777-7777-777777777777') {
          return { ...m, clave: 'PHLAC-203-TIJ', semestre: '2° Semestre' };
        }
        if (m.clave === 'CDIA-101' || m.id === 'f1111111-1111-1111-1111-111111111111') {
          return { ...m, clave: 'PHLCDN-201-TIJ', semestre: '2° Semestre' };
        }
        return m;
      });
      if (!currentMats.some((m) => m.clave === 'LCDN-401')) {
        currentMats.push({
          id: 'da9f6013-226d-49a1-ba7a-6adfb97a7c35',
          carrera_id: 'c1111111-1111-1111-1111-111111111111',
          clave: 'LCDN-401',
          nombre: 'Bases de Datos NOSQL',
          creditos: 8,
          semestre: '4° Semestre',
          horas_semana: 6,
        });
      }
    }
    localStorage.setItem('unrc_materias', JSON.stringify(currentMats));
    localStorage.setItem('unrc_materias_v3_official', 'true');
  }
  if (!localStorage.getItem('unrc_grupos') || !localStorage.getItem('unrc_grupos_tij_v1')) {
    localStorage.setItem('unrc_grupos', JSON.stringify(MOCK_GRUPOS));
    localStorage.setItem('unrc_grupos_tij_v1', 'true');
  }
  
  if (!localStorage.getItem('unrc_docentes') || !localStorage.getItem('unrc_docentes_tij_v1')) {
    localStorage.setItem('unrc_docentes', JSON.stringify(MOCK_DOCENTES));
    localStorage.setItem('unrc_docentes_tij_v1', 'true');
  }

  // Ensure Docentes are also seeded into Supabase
  if (!localStorage.getItem('unrc_docentes_supabase_synced_v1') && supabase) {
    try {
      const docPayloads = MOCK_DOCENTES.map(d => ({
        id: d.id,
        num_empleado: d.num_empleado,
        nombre: d.nombre,
        apellido_paterno: d.apellido_paterno,
        apellido_materno: d.apellido_materno || '',
        email: d.email,
        departamento: d.departamento,
        puesto: d.puesto || 'docente',
        materias: d.materias,
        carreras_asignadas: d.carreras_asignadas,
        sede_id: 'sede-tij',
        sede_nombre: 'Campus Tijuana',
        telefono: d.telefono,
        password: d.password || getDefaultUserPassword(d.num_empleado, '2026-2')
      }));
      (supabase.from('docentes').upsert(docPayloads, { onConflict: 'num_empleado' }) as any).then(() => {
        localStorage.setItem('unrc_docentes_supabase_synced_v1', 'true');
      }).catch((err: any) => {
        console.warn('Docentes initial sync to Supabase notice:', err);
      });
    } catch (e) {
      console.warn('Docentes initial sync notice:', e);
    }
  }

  // Seed or normalize all alumnos: Empty default so imported official data is preserved
  if (!localStorage.getItem('unrc_alumnos')) {
    localStorage.setItem('unrc_alumnos', JSON.stringify([]));
    localStorage.setItem('unrc_alumnos_v5_tijuana', 'true');
  } else if (!localStorage.getItem('unrc_alumnos_v5_tijuana')) {
    try {
      const raw = localStorage.getItem('unrc_alumnos');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map((a: Alumno) => ({
            ...a,
            sede_id: 'sede-tij',
            sede_nombre: 'Campus Tijuana'
          }));
          localStorage.setItem('unrc_alumnos', JSON.stringify(migrated));
        }
      }
    } catch (e) {
      console.warn('Error during auto-migration of alumnos to Campus Tijuana:', e);
    }
    localStorage.setItem('unrc_alumnos_v5_tijuana', 'true');
  }

  // Auto-migration: Purge all mock/demo matriculas (al-1..al-46, UNRC-2026-001..UNRC-2026-050)
  // and their associated demo asistencias and participaciones so user can insert/import real students.
  if (!localStorage.getItem('unrc_mock_matriculas_purged_v2')) {
    try {
      const rawAlumnos = localStorage.getItem('unrc_alumnos');
      if (rawAlumnos) {
        const parsed = JSON.parse(rawAlumnos);
        if (Array.isArray(parsed)) {
          const purgedIds = new Set<string>();
          const purgedMatriculas = new Set<string>();
          
          const realAlumnos = parsed.filter((a: Alumno) => {
            const isMockId = typeof a.id === 'string' && /^al-\d+$/i.test(a.id);
            const isMockMatricula = typeof a.matricula === 'string' && /^UNRC-2026-0(?:0[1-9]|[1-4][0-9]|50)$/i.test(a.matricula.trim());
            if (isMockId || isMockMatricula) {
              if (a.id) purgedIds.add(a.id);
              if (a.matricula) purgedMatriculas.add(a.matricula.trim().toUpperCase());
              return false;
            }
            return true;
          });

          localStorage.setItem('unrc_alumnos', JSON.stringify(realAlumnos));

          // Also purge associated asistencias
          const rawAsist = localStorage.getItem('unrc_asistencias');
          if (rawAsist) {
            const asistList = JSON.parse(rawAsist);
            if (Array.isArray(asistList)) {
              const cleanAsist = asistList.filter((as: Asistencia) => {
                if (as.id && as.id.startsWith('as-tur-')) return false;
                if (purgedIds.has(as.alumno_id)) return false;
                if (typeof as.alumno_id === 'string' && /^al-\d+$/i.test(as.alumno_id)) return false;
                if (typeof as.alumno_id === 'string' && purgedMatriculas.has(as.alumno_id.toUpperCase())) return false;
                return true;
              });
              localStorage.setItem('unrc_asistencias', JSON.stringify(cleanAsist));
            }
          }

          // Also purge associated participaciones
          const rawPart = localStorage.getItem('unrc_participaciones');
          if (rawPart) {
            const partList = JSON.parse(rawPart);
            if (Array.isArray(partList)) {
              const cleanPart = partList.filter((p: Participacion) => {
                if (purgedIds.has(p.alumno_id)) return false;
                if (typeof p.alumno_id === 'string' && /^al-\d+$/i.test(p.alumno_id)) return false;
                if (typeof p.alumno_id === 'string' && purgedMatriculas.has(p.alumno_id.toUpperCase())) return false;
                return true;
              });
              localStorage.setItem('unrc_participaciones', JSON.stringify(cleanPart));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error during auto-migration of mock matriculas purge:', e);
    }
    localStorage.setItem('unrc_mock_matriculas_purged_v2', 'true');
  }

  // Auto-migration: Dr. Adrian Silva is Docente, not Tutor
  if (!localStorage.getItem('unrc_alumnos_v6_tutor_fix')) {
    try {
      const raw = localStorage.getItem('unrc_alumnos');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let modified = false;
          const fixed = parsed.map((a: Alumno) => {
            if (a.tutor && (a.tutor.toLowerCase().includes('adrian silva') || a.tutor.toLowerCase().includes('adrián silva'))) {
              modified = true;
              return {
                ...a,
                tutor: 'Tutor UNRC'
              };
            }
            return a;
          });
          if (modified) {
            localStorage.setItem('unrc_alumnos', JSON.stringify(fixed));
          }
        }
      }
    } catch (e) {
      console.warn('Error during auto-migration of tutor/docente fix:', e);
    }
    localStorage.setItem('unrc_alumnos_v6_tutor_fix', 'true');
  }

  // Auto-migration: Corregir integridad de carrera y grupo en horarios docentes (Turismo vs Administración)
  if (!localStorage.getItem('unrc_docentes_carrera_integrity_v2')) {
    try {
      const raw = localStorage.getItem('unrc_docentes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let modified = false;
          const fixed = parsed.map((d: Docente) => {
            if (d.horarios && d.horarios.length > 0) {
              const updatedHorarios = d.horarios.map((h: HorarioDocenteItem) => {
                if (
                  (h.materia?.toLowerCase().includes('hospedaje') || h.materia?.toLowerCase().includes('hotel')) &&
                  (h.grupo?.toLowerCase().includes('phlac') || h.grupo?.toLowerCase().includes('203'))
                ) {
                  modified = true;
                  return {
                    ...h,
                    carrera: 'Lic. en Turismo',
                    grupo: '201-TUR',
                    materia: 'Administración de Empresas de Hospedaje',
                    aula: h.aula || 'Aula Virtual UNRC (Google Meet)',
                    es_en_linea: Boolean(h.es_en_linea || h.dia?.toLowerCase().includes('sab') || h.dia?.toLowerCase().includes('sáb'))
                  };
                }
                return h;
              });
              return { ...d, horarios: updatedHorarios };
            }
            return d;
          });
          if (modified) {
            localStorage.setItem('unrc_docentes', JSON.stringify(fixed));
          }
        }
      }
    } catch (e) {
      console.warn('Error during auto-migration of docentes carrera integrity:', e);
    }
    localStorage.setItem('unrc_docentes_carrera_integrity_v2', 'true');
  }

  // Seed Participaciones if empty
  if (!localStorage.getItem('unrc_participaciones')) {
    localStorage.setItem('unrc_participaciones', JSON.stringify([]));
  }

  // Seed Asistencias if empty
  if (!localStorage.getItem('unrc_asistencias')) {
    localStorage.setItem('unrc_asistencias', JSON.stringify([]));
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
    let list: Sede[] = raw ? JSON.parse(raw) : [...MOCK_SEDES];
    if (!list.some((s) => s.id === 'sede-tij' || s.nombre.toLowerCase().includes('tijuana'))) {
      list.unshift({ id: 'sede-tij', clave: 'UNRC-TIJ', nombre: 'Campus Tijuana', direccion: 'Blvd. Bellas Artes, Otay, Tijuana, B.C.', director: 'Dr. Adrian Silva', telefono: '+526641234567', capacidad: 1500, activa: true });
      localStorage.setItem('unrc_sedes', JSON.stringify(list));
    }
    return list;
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
        sede_id: 'sede-tij',
        sede_nombre: 'Campus Tijuana',
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

    const cleanHorarios = (params.horarios || []).map(h => {
      if (
        (h.materia?.toLowerCase().includes('hospedaje') || h.materia?.toLowerCase().includes('hotel')) &&
        (h.grupo?.toLowerCase().includes('phlac') || h.grupo?.toLowerCase().includes('203') || !h.grupo)
      ) {
        return {
          ...h,
          carrera: 'Lic. en Turismo',
          grupo: '201-TUR',
          materia: 'Administración de Empresas de Hospedaje',
          aula: h.aula || 'Aula Virtual UNRC (Google Meet)',
          es_en_linea: Boolean(h.es_en_linea || h.dia?.toLowerCase().includes('sab') || h.dia?.toLowerCase().includes('sáb'))
        };
      }
      return h;
    });

    if (index === -1) {
      const mock = MOCK_DOCENTES.find(m => m.id === docenteId || m.num_empleado === docenteId) || MOCK_DOCENTES[0];
      const newDoc: Docente = {
        ...mock,
        id: docenteId,
        carreras_asignadas: params.carreras_asignadas,
        materias: params.materias,
        horario_resumen: params.horario_resumen,
        horarios: cleanHorarios,
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
        horarios: cleanHorarios,
        sede_nombre: params.sede_nombre || docentes[index].sede_nombre
      };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(docentes));
    }

    // Sync to Supabase directly (Dual-Mode: native columns + safe meta fallback)
    if (supabase) {
      try {
        const targetDoc = docentes[index];
        const baseDept = (params.carreras_asignadas && params.carreras_asignadas.length > 0)
          ? params.carreras_asignadas.join(' / ')
          : (targetDoc.departamento || 'Licenciatura');

        const scheduleMeta = {
          horarios: params.horarios,
          horario_resumen: params.horario_resumen,
          carreras_asignadas: params.carreras_asignadas,
          sede_nombre: params.sede_nombre || targetDoc.sede_nombre || 'Campus Tijuana'
        };
        const encodedDept = `${baseDept}\n@@UNRC_DOC_META@@${JSON.stringify(scheduleMeta)}`;

        // Attempt 1: Try native columns if existing in Supabase schema
        let updatedInDb = false;
        try {
          const payloadWithNative: Record<string, any> = {
            materias: params.materias,
            carreras_asignadas: params.carreras_asignadas,
            departamento: encodedDept,
            horario_resumen: params.horario_resumen,
            horarios: params.horarios,
            sede_nombre: params.sede_nombre || targetDoc.sede_nombre
          };
          const { data: natRes, error: natErr } = await supabase
            .from('docentes')
            .update(payloadWithNative)
            .eq('num_empleado', targetDoc.num_empleado)
            .select();

          if (!natErr && natRes && natRes.length > 0) {
            updatedInDb = true;
          }
        } catch (e) {
          // Native columns not yet added, fallback to standard schema
        }

        // Attempt 2: Fallback update standard columns + embedded metadata
        if (!updatedInDb) {
          const { data: stdRes, error: stdErr } = await supabase
            .from('docentes')
            .update({
              materias: params.materias,
              departamento: encodedDept
            })
            .eq('num_empleado', targetDoc.num_empleado)
            .select();

          if (stdRes && stdRes.length > 0) {
            updatedInDb = true;
          }
        }

        // Attempt 3: If docente was not in Supabase yet, insert new row
        if (!updatedInDb) {
          await supabase.from('docentes').insert([{
            id: targetDoc.id,
            num_empleado: targetDoc.num_empleado,
            nombre: targetDoc.nombre,
            apellido_paterno: targetDoc.apellido_paterno,
            apellido_materno: targetDoc.apellido_materno || '',
            email: targetDoc.email,
            departamento: encodedDept,
            materias: params.materias,
            telefono: targetDoc.telefono || ''
          }]);
        }
      } catch (err) {
        console.warn('Supabase assignation background update notice:', err);
      }
    }

    // Also link to grupos so all scheduled blocks per group are aggregated properly
    try {
      const grupos = await db.getGrupos();
      const groupMap = new Map<string, HorarioDocenteItem[]>();
      params.horarios.forEach(h => {
        if (!h.grupo) return;
        const list = groupMap.get(h.grupo) || [];
        list.push(h);
        groupMap.set(h.grupo, list);
      });

      const docFullName = `${docentes[index].nombre} ${docentes[index].apellido_paterno}`.trim();

      groupMap.forEach((slots, grupoClave) => {
        const fullHorarioStr = slots.map(s => `${s.dia} (${s.hora_inicio} - ${s.hora_fin} hrs)`).join(' | ');
        const allDias = Array.from(new Set(slots.map(s => s.dia)));
        const allAulas = Array.from(new Set(slots.map(s => s.aula).filter(Boolean))).join(' / ');

        const gIdx = grupos.findIndex(g => g.clave_grupo === grupoClave);
        if (gIdx !== -1) {
          grupos[gIdx].docente_nombre = docFullName;
          grupos[gIdx].docente_id = docentes[index].id;
          grupos[gIdx].horario = fullHorarioStr;
          grupos[gIdx].dias_clase = allDias;
          if (allAulas) grupos[gIdx].aula = allAulas;
        } else {
          grupos.push({
            id: `g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            clave_grupo: grupoClave,
            carrera_id: 'c1111111-1111-1111-1111-111111111111',
            materia_id: 'm-auto',
            sede_id: docentes[index].sede_nombre || 'sede-tij',
            sede_nombre: docentes[index].sede_nombre || 'Campus Tijuana',
            turno: 'Matutino',
            periodo: '2026-2',
            horario: fullHorarioStr,
            dias_clase: allDias,
            docente_nombre: docFullName,
            docente_id: docentes[index].id,
            aula: allAulas || 'Aula Asignada'
          });
        }
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('unrc_grupos', JSON.stringify(grupos));
      }

      // Also link docente to matching alumnos
      const alumnos = await db.getAlumnos();
      let alumnosModified = false;
      groupMap.forEach((_, grupoClave) => {
        const cleanG = grupoClave.toLowerCase().replace(/[\s-_]/g, '');
        alumnos.forEach(al => {
          const cleanAlG = (al.grupo || '').toLowerCase().replace(/[\s-_]/g, '');
          if (cleanAlG === cleanG || cleanAlG.includes(cleanG) || cleanG.includes(cleanAlG)) {
            al.docente_nombre = docFullName;
            al.docente_id = docentes[index].id;
            alumnosModified = true;
          }
        });
      });
      if (alumnosModified && typeof window !== 'undefined') {
        localStorage.setItem('unrc_alumnos', JSON.stringify(alumnos));
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
            sede_id: sc.sede_id || 'sede-tij',
            sede_nombre: sc.sede_nombre || 'Campus Tijuana'
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

    const getDeletedMaterias = (): string[] => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = localStorage.getItem('unrc_deleted_materias');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const getModifiedMaterias = (): Record<string, Partial<Materia>> => {
      if (typeof window === 'undefined') return {};
      try {
        const raw = localStorage.getItem('unrc_modified_materias');
        const parsed = raw ? JSON.parse(raw) : {};
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    };

    const deletedList = getDeletedMaterias();
    const modifiedMap = getModifiedMaterias();

    const isExcluded = (m: { id?: string; clave?: string }) => {
      if (!m) return true;
      if (m.id && deletedList.includes(m.id)) return true;
      if (m.clave && deletedList.includes(m.clave)) return true;
      if (m.clave && m.clave.toUpperCase().startsWith('TEST-')) return true;
      return false;
    };

    // 1. Load active local catalog (primary source of truth for user updates)
    let localList: Materia[] = [];
    const raw = typeof window !== 'undefined' ? localStorage.getItem('unrc_materias') : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localList = parsed.filter(m => !isExcluded(m)).map((m) => {
            if (m.clave === 'ADM-203' || m.id === 'f7777777-7777-7777-7777-777777777777') {
              return { ...m, clave: 'PHLAC-203-TIJ', semestre: '2° Semestre' };
            }
            if (m.clave === 'CDIA-101' || m.id === 'f1111111-1111-1111-1111-111111111111') {
              return { ...m, clave: 'PHLCDN-201-TIJ', semestre: '2° Semestre' };
            }
            return m;
          });
        }
      } catch (e) {
        console.warn('Error parsing unrc_materias:', e);
      }
    }

    // 2. Fetch from Supabase and merge without overwriting user modifications
    let remoteList: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('materias').select('*').order('clave', { ascending: true });
        if (!error && data && data.length > 0) {
          remoteList = data.filter((sm: any) => !isExcluded(sm)).map((sm: any) => {
            let clave = sm.clave;
            let semestre = sm.semestre || '1° Semestre';
            if (sm.clave === 'ADM-203' || sm.id === 'f7777777-7777-7777-7777-777777777777') {
              clave = 'PHLAC-203-TIJ';
              semestre = '2° Semestre';
            } else if (sm.clave === 'CDIA-101' || sm.id === 'f1111111-1111-1111-1111-111111111111') {
              clave = 'PHLCDN-201-TIJ';
              semestre = '2° Semestre';
            }
            return {
              id: sm.id,
              carrera_id: sm.carrera_id,
              clave,
              nombre: sm.nombre,
              creditos: sm.creditos || 8,
              semestre,
              horas_semana: sm.horas_semana || 6
            };
          });
        }
      } catch (err) {
        console.warn('Notice reading materias from Supabase:', err);
      }
    }

    // 3. Assemble combined list preserving user modifications
    let combined: Materia[] = [];
    if (localList.length > 0) {
      combined = [...localList];
      // Append any remote materias that do not yet exist locally
      remoteList.forEach((rm) => {
        const alreadyExists = combined.some(
          (lm) =>
            lm.id === rm.id ||
            lm.clave.toUpperCase().trim() === rm.clave.toUpperCase().trim() ||
            (rm.clave === 'ADM-203' && lm.clave === 'PHLAC-203-TIJ') ||
            (rm.clave === 'CDIA-101' && lm.clave === 'PHLCDN-201-TIJ')
        );
        if (!alreadyExists) {
          combined.push(rm);
        }
      });
    } else if (remoteList.length > 0) {
      combined = [...remoteList];
    } else {
      combined = [...MOCK_MATERIAS];
    }

    // Apply explicit user modifiedMap if present
    const enriched = combined
      .filter(m => !isExcluded(m))
      .map(m => {
        const mod = modifiedMap[m.id] || modifiedMap[m.clave] || {};
        return { ...m, ...mod };
      });

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_materias', JSON.stringify(enriched));
    }
    return enriched;
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
        sede_id: 'sede-tij',
        sede_nombre: 'Campus Tijuana',
        turno: 'Matutino',
        periodo: '2026-2',
        horario: 'Miércoles (09:00 - 11:00 hrs) y Sábados (07:00 - 09:00 hrs)',
        dias_clase: ['Miércoles', 'Sábado'],
        docente_nombre: 'Dr. Adrian Silva',
        aula: 'Aula Virtual UNRC (Google Meet)'
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
        sede_id: updates.sede_id || 'sede-tij',
        sede_nombre: updates.sede_nombre || 'Campus Tijuana',
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_materias', JSON.stringify(list));
    }
    await db.addAuditoria('ALTA_MATERIA', 'Plan Curricular', `Se agregó asignatura ${newMateria.nombre} (${newMateria.clave})`, 'Administrador');
    return newMateria;
  },

  updateMateria: async (id: string, updates: Partial<Materia>): Promise<Materia | null> => {
    initLocalStorage();
    
    // Read directly from current active localStorage cache to avoid stale remote overwrite
    let list: Materia[] = [];
    const raw = typeof window !== 'undefined' ? localStorage.getItem('unrc_materias') : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    if (list.length === 0) {
      list = await db.getMaterias();
    }
    
    // Exact search priority: ID first, then current clave or modified clave
    let index = list.findIndex(m => m.id === id);
    if (index === -1) {
      index = list.findIndex(m => m.clave.toUpperCase().trim() === id.toUpperCase().trim());
    }
    if (index === -1) {
      index = list.findIndex(m =>
        (id.startsWith('f1') && (m.id === 'm1' || m.clave.includes('PHLCDN-201') || m.clave.includes('CDIA-101') || m.nombre.toLowerCase().includes('web'))) ||
        (id.startsWith('f2') && (m.id === 'm2' || m.clave.includes('CDIA-102') || m.nombre.toLowerCase().includes('artificial'))) ||
        (id.startsWith('f3') && (m.id === 'm3' || m.clave.includes('TIC-201') || m.nombre.toLowerCase().includes('datos'))) ||
        (id.startsWith('f4') && (m.id === 'm4' || m.clave.includes('TIC-301') || m.nombre.toLowerCase().includes('software'))) ||
        (id.startsWith('f5') && (m.id === 'm5' || m.clave.includes('CIB-501') || m.nombre.toLowerCase().includes('ciber'))) ||
        (id.startsWith('f6') && (m.id === 'm6' || m.clave.includes('TUR-201') || m.nombre.toLowerCase().includes('hospedaje'))) ||
        (id.startsWith('f7') && (m.id === 'm7' || m.clave.includes('PHLAC-203') || m.clave.includes('ADM-203') || m.nombre.toLowerCase().includes('administración')))
      );
    }

    if (index === -1) {
      const newMat: Materia = {
        id: id || `m-${Date.now()}`,
        carrera_id: updates.carrera_id || 'c1111111-1111-1111-1111-111111111111',
        clave: updates.clave || 'MAT',
        nombre: updates.nombre || 'Nueva Materia',
        creditos: updates.creditos !== undefined ? updates.creditos : 8,
        semestre: updates.semestre || '1° Semestre',
        horas_semana: updates.horas_semana !== undefined ? updates.horas_semana : 6,
        ...updates
      };
      list.push(newMat);
      index = list.length - 1;
    }

    const targetId = list[index].id;
    const oldClave = list[index].clave;
    const oldNombre = list[index].nombre;

    list[index] = {
      ...list[index],
      ...updates,
      ...(updates.clave ? { clave_modificada: updates.clave } : {})
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_materias', JSON.stringify(list));
      
      // Store in persistent modified map
      try {
        const rawMod = localStorage.getItem('unrc_modified_materias');
        const modMap = rawMod ? JSON.parse(rawMod) : {};
        modMap[targetId] = { ...(modMap[targetId] || {}), ...updates };
        if (updates.clave) modMap[updates.clave] = { ...(modMap[updates.clave] || {}), ...updates };
        if (oldClave) modMap[oldClave] = { ...(modMap[oldClave] || {}), ...updates };
        localStorage.setItem('unrc_modified_materias', JSON.stringify(modMap));
      } catch (e) {}
    }

    // Propagate clave or name update to docente assignments and grupos
    if ((updates.clave && updates.clave !== oldClave) || (updates.nombre && updates.nombre !== oldNombre)) {
      try {
        const rawGrupos = typeof window !== 'undefined' ? localStorage.getItem('unrc_grupos') : null;
        if (rawGrupos) {
          const grupos = JSON.parse(rawGrupos);
          let changed = false;
          grupos.forEach((g: any) => {
            if (g.materia_id === targetId || g.materia === oldNombre || (g.materia_clave && g.materia_clave === oldClave)) {
              if (updates.clave) g.materia_clave = updates.clave;
              if (updates.nombre) g.materia = updates.nombre;
              changed = true;
            }
          });
          if (changed && typeof window !== 'undefined') {
            localStorage.setItem('unrc_grupos', JSON.stringify(grupos));
          }
        }
      } catch (e) {
        console.warn('Sync related materia entities:', e);
      }
    }

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
            .eq('id', targetId);
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
    let list: Materia[] = [];
    const raw = typeof window !== 'undefined' ? localStorage.getItem('unrc_materias') : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    if (list.length === 0) {
      list = await db.getMaterias();
    }

    const target = list.find(m => m.id === id || m.clave === id || (m as any).clave_modificada === id);
    const targetId = target ? target.id : id;
    const targetClave = target ? target.clave : id;

    list = list.filter(m => m.id !== targetId && m.clave !== targetClave && m.clave !== id && m.id !== id);

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_materias', JSON.stringify(list));
      
      // Add to deleted blacklist so remote Supabase queries never restore it
      try {
        const rawDel = localStorage.getItem('unrc_deleted_materias');
        const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
        if (targetId && !delList.includes(targetId)) delList.push(targetId);
        if (targetClave && !delList.includes(targetClave)) delList.push(targetClave);
        if (id && !delList.includes(id)) delList.push(id);
        localStorage.setItem('unrc_deleted_materias', JSON.stringify(delList));

        // Clean from modified map
        const rawMod = localStorage.getItem('unrc_modified_materias');
        if (rawMod) {
          const modMap = JSON.parse(rawMod);
          delete modMap[targetId];
          delete modMap[targetClave];
          if (id) delete modMap[id];
          localStorage.setItem('unrc_modified_materias', JSON.stringify(modMap));
        }
      } catch (e) {}
    }

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

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (!error && data && data.length > 0) {
          const valid = data.filter((sa: any) => !sa.matricula?.startsWith('UNRC-2026-'));
          if (valid.length > 0) {
            const list: Alumno[] = valid.map((sa: any) => {
              const cName = (sa.carrera || '').toLowerCase();
              const cId = (sa.carrera_id || '').toLowerCase();
              const grp = (sa.grupo || '').toLowerCase();
              const isTurismo = cName.includes('turis') || cId.includes('c4') || grp.includes('tur');
              const isAdm = (cName.includes('admin') || cId.includes('c5') || grp.includes('phlac') || grp.includes('203')) && !grp.includes('lcdn');
              const isCdIA = cName.includes('datos') || cName.includes('negocios') || grp.includes('lcdn') || cId.includes('c1');

              return {
                id: sa.id,
                matricula: sa.matricula,
                nombre: sa.nombre,
                apellido_paterno: sa.apellido_paterno,
                apellido_materno: sa.apellido_materno || '',
                grado: sa.grado || '2° Semestre',
                grupo: sa.grupo || (isTurismo ? 'PHLTUR-201-TIJ' : isAdm ? 'PHLAC-203-TIJ' : '401-LCDN'),
                carrera: isTurismo
                  ? 'Licenciatura en Turismo'
                  : isAdm
                  ? 'Licenciatura en Administración'
                  : isCdIA
                  ? 'Licenciatura en Ciencias de Datos e Inteligencia Artificial'
                  : sa.carrera || 'Licenciatura UNRC',
                carrera_id: sa.carrera_id,
                grupo_id: sa.grupo_id,
                sede_id: sa.sede_id || 'sede-tij',
                sede_nombre: sa.sede_nombre || 'Campus Tijuana',
                ciclo_id: sa.ciclo_id || '2026-2',
                estado_matricula: sa.estado_matricula || 'activo',
                tutor: sa.tutor || 'Tutor UNRC',
                telefono: sa.telefono || '+525500000000',
                foto_url: sa.foto_url,
                qr_code: sa.qr_code || sa.matricula,
                docente_nombre: sa.docente_nombre || 'Dr. Adrian Silva',
                docente_id: sa.docente_id || 'docente-3',
                password: sa.password || getDefaultUserPassword(sa.matricula, '2026-2'),
                created_at: sa.created_at
              };
            });
            localStorage.setItem('unrc_alumnos', JSON.stringify(list));
            return list;
          }
        }
      } catch (e) {
        console.warn('Supabase getAlumnos notice:', e);
      }
    }

    const raw = localStorage.getItem('unrc_alumnos');
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) {
            return [];
          }
          let hadChanges = false;
          const enriched = parsed.map((a: Alumno) => {
            let item = { ...a };
            const cName = (item.carrera || '').toLowerCase();
            const cId = (item.carrera_id || '').toLowerCase();
            const grp = (item.grupo || '').toLowerCase();

            // Sede respect & normalization: All students correspond to Campus Tijuana
            if (
              !item.sede_nombre ||
              item.sede_nombre === 'Campus Magdalena Contreras' ||
              item.sede_nombre === 'Sede Justo Sierra' ||
              item.sede_nombre === 'Sede Coyoacán' ||
              item.sede_nombre === 'Sede Azcapotzalco' ||
              item.sede_id === 'sede-mc' ||
              item.sede_id === 'sede-js' ||
              item.sede_id === 'sede-coy' ||
              item.sede_id === 'sede-azc' ||
              !item.sede_id
            ) {
              item.sede_nombre = 'Campus Tijuana';
              item.sede_id = 'sede-tij';
              hadChanges = true;
            }

            // Career respect:
            const isPHLAC = grp.includes('phlac') || grp.includes('lac');
            if (isPHLAC && !cName.includes('administra')) {
              hadChanges = true;
              item.carrera = 'Licenciatura en Administración';
              item.carrera_id = 'c5555555-5555-5555-5555-555555555555';
            }

            // Check for students uploaded to Tijuana or with group 301 that belong to Data Science but got misassigned to Turismo
            const isMisassignedTijuanaDatos =
              (item.sede_nombre?.toLowerCase().includes('tijuana') || item.sede_id?.toLowerCase().includes('tijuana')) &&
              (item.grupo === '301' || ['UNRC-2026-057', 'UNRC-2026-058', 'UNRC-2026-059', 'UNRC-2026-061'].includes(item.matricula));

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
            } else if (cId === 'c5555555-5555-5555-5555-555555555555' || cName.includes('administra') || cId === 'c5' || isPHLAC) {
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

            if (item.tutor && (item.tutor.toLowerCase().includes('adrian silva') || item.tutor.toLowerCase().includes('adrián silva'))) {
              hadChanges = true;
              item.tutor = 'Tutor UNRC';
            }

            if (!item.docente_nombre || item.docente_nombre.includes('Tutor') || item.docente_nombre === 'Tutor UNRC') {
              hadChanges = true;
              item.docente_nombre = 'Dr. Adrian Silva';
              item.docente_id = 'docente-3';
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
            const grp = (sa.grupo || mockMatch?.grupo || '').toLowerCase();
            const isTurismo = cName.includes('turis') || cId.includes('c4');
            const isAdm = cName.includes('admin') || cId.includes('c5') || grp.includes('phlac') || grp.includes('lac');
            const isCdIA = cName.includes('datos') || cName.includes('inteligencia') || cId.includes('c1');
            const isTic = cName.includes('tic') || cName.includes('tecnolog') || cId.includes('c2');
            const isCib = cName.includes('ciber') || cId.includes('c3');

            // Infer sede: All students correspond to Campus Tijuana
            let resolvedSedeId = sa.sede_id || mockMatch?.sede_id || 'sede-tij';
            let resolvedSedeNombre = sa.sede_nombre || mockMatch?.sede_nombre || 'Campus Tijuana';
            if (
              !resolvedSedeNombre ||
              resolvedSedeNombre === 'Campus Magdalena Contreras' ||
              resolvedSedeNombre === 'Sede Justo Sierra' ||
              resolvedSedeNombre === 'Sede Coyoacán' ||
              resolvedSedeNombre === 'Sede Azcapotzalco' ||
              resolvedSedeId === 'sede-mc' ||
              resolvedSedeId === 'sede-js' ||
              resolvedSedeId === 'sede-coy' ||
              resolvedSedeId === 'sede-azc'
            ) {
              resolvedSedeNombre = 'Campus Tijuana';
              resolvedSedeId = 'sede-tij';
              if (supabase && (sa.sede_nombre !== 'Campus Tijuana' || sa.sede_id !== 'sede-tij')) {
                supabase.from('alumnos').update({ sede_id: 'sede-tij', sede_nombre: 'Campus Tijuana' }).eq('id', sa.id).then();
              }
            }

            // Dr. Adrian Silva is Docente, not Tutor
            const rawTutor = sa.tutor || mockMatch?.tutor || '';
            const isSilvaTutor = rawTutor.toLowerCase().includes('adrian silva') || rawTutor.toLowerCase().includes('adrián silva');
            const resolvedTutor = isSilvaTutor ? 'Tutor UNRC' : (rawTutor || 'Tutor UNRC');
            if (supabase && isSilvaTutor) {
              supabase.from('alumnos').update({ tutor: 'Tutor UNRC' }).eq('id', sa.id).then();
            }

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
              tutor: resolvedTutor,
              docente_nombre: sa.docente_nombre || mockMatch?.docente_nombre || 'Dr. Adrian Silva',
              docente_id: sa.docente_id || mockMatch?.docente_id || 'docente-3',
              password: sa.password || mockMatch?.password || getDefaultUserPassword(sa.matricula, '2026-2'),
              sede_id: resolvedSedeId,
              sede_nombre: resolvedSedeNombre,
              ciclo_id: sa.ciclo_id || mockMatch?.ciclo_id || 'ciclo-2026-2',
              estado_matricula: sa.estado_matricula || mockMatch?.estado_matricula || 'activo',
              grupo_id: sa.grupo_id || mockMatch?.grupo_id || (isTurismo ? 'g201-tur' : isAdm ? 'g203-tij' : 'g101')
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
      docente_nombre: a.docente_nombre || 'Dr. Adrian Silva',
      docente_id: a.docente_id || 'docente-3',
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
          apellido_materno: newAlumno.apellido_materno || '',
          grado: newAlumno.grado,
          grupo: newAlumno.grupo,
          carrera: newAlumno.carrera,
          tutor: newAlumno.tutor,
          telefono: newAlumno.telefono,
          qr_code: newAlumno.qr_code,
          carrera_id: newAlumno.carrera_id,
          grupo_id: newAlumno.grupo_id,
          sede_id: newAlumno.sede_id || 'sede-tij',
          sede_nombre: newAlumno.sede_nombre || 'Campus Tijuana',
          ciclo_id: newAlumno.ciclo_id,
          estado_matricula: newAlumno.estado_matricula || 'activo',
          docente_nombre: newAlumno.docente_nombre || null,
          docente_id: newAlumno.docente_id || null,
          password: newAlumno.password
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
    options: { updateExisting?: boolean } = { updateExisting: false }
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

      // Match strictly by exact matrícula: never match loosely by name to overwrite/replace another student's identity
      const existingIndex = current.findIndex((a) => {
        return (a.matricula || '').trim().toLowerCase() === matriculaClean.toLowerCase();
      });

      const resolvedPassword =
        al.password && al.password.trim()
          ? al.password.trim()
          : getDefaultUserPassword(matriculaClean, '2026-2');

      const resolvedQRCode = al.qr_code && al.qr_code.trim() ? al.qr_code.trim() : matriculaClean;

      if (existingIndex >= 0) {
        // QUE NO SE REEMPLACEN: Si ya existe y no se autoriza actualización, no se reemplaza
        if (options.updateExisting === true) {
          const existing = current[existingIndex];
          const updatedItem: Alumno = {
            ...existing,
            ...al,
            id: existing.id,
            matricula: existing.matricula, // INMUTABLE: Jamás reemplazar la matrícula original del alumno
            password: al.password?.trim() || existing.password || resolvedPassword,
            qr_code: existing.qr_code || existing.matricula,
            estado_matricula: al.estado_matricula || existing.estado_matricula || 'activo',
            created_at: existing.created_at || new Date().toISOString()
          };
          current[existingIndex] = updatedItem;
          processedItems.push(updatedItem);
          updatedCount++;
        } else {
          // No reemplazar ni modificar el estudiante existente
          continue;
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
          docente_nombre: item.docente_nombre || null,
          docente_id: item.docente_id || null,
          telefono: item.telefono || '+525500000000',
          foto_url: item.foto_url,
          qr_code: item.qr_code || item.matricula,
          password: item.password
        }));

        const { error: upsertErr } = await supabase
          .from('alumnos')
          .upsert(supabasePayload, { onConflict: 'matricula' });

        if (upsertErr) {
          console.warn('Full upsert notice, trying base schema:', upsertErr.message);
          // Fallback to base columns that exist on live Supabase
          const basePayload = processedItems.map((item) => ({
            matricula: item.matricula,
            nombre: item.nombre,
            apellido_paterno: item.apellido_paterno,
            apellido_materno: item.apellido_materno || '',
            grado: item.grado,
            grupo: item.grupo,
            carrera: item.carrera || 'Licenciatura UNRC',
            carrera_id: item.carrera_id || null,
            grupo_id: item.grupo_id || null,
            tutor: item.tutor || 'Tutor Registrado',
            telefono: item.telefono || '+525500000000',
            foto_url: item.foto_url || null,
            qr_code: item.qr_code || item.matricula
          }));
          await supabase
            .from('alumnos')
            .upsert(basePayload, { onConflict: 'matricula' });
        }
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

  deleteAllAlumnos: async (idsOrMatriculas?: string[]): Promise<number> => {
    initLocalStorage();
    let list = await db.getAlumnos();
    let deletedCount = 0;

    if (idsOrMatriculas && idsOrMatriculas.length > 0) {
      const toDeleteSet = new Set(idsOrMatriculas.map(id => id.trim().toLowerCase()));
      const remaining = list.filter(
        a => !toDeleteSet.has((a.id || '').toLowerCase()) && !toDeleteSet.has((a.matricula || '').toLowerCase())
      );
      deletedCount = list.length - remaining.length;
      list = remaining;
      localStorage.setItem('unrc_alumnos', JSON.stringify(list));

      if (supabase) {
        try {
          await supabase.from('alumnos').delete().in('matricula', idsOrMatriculas);
        } catch (e) {
          console.warn('Supabase bulk delete notice:', e);
        }
      }
    } else {
      deletedCount = list.length;
      list = [];
      localStorage.setItem('unrc_alumnos', JSON.stringify([]));

      if (supabase) {
        try {
          await supabase.from('alumnos').delete().neq('id', 'all_records_safeguard_never_matches');
        } catch (e) {
          console.warn('Supabase delete all notice:', e);
        }
      }
    }

    await db.addAuditoria(
      'ELIMINACION_MASIVA_ALUMNOS',
      'Servicios Escolares / Matrículas',
      `Se eliminaron ${deletedCount} expedientes de alumnos del sistema`,
      'Control Escolar'
    );

    return deletedCount;
  },

  limpiarMatriculasFalsas: async (): Promise<{ alumnosEliminados: number; asistenciasEliminadas: number; participacionesEliminadas: number }> => {
    initLocalStorage();
    let alumnos = await db.getAlumnos();
    const purgedIds = new Set<string>();
    const purgedMatriculas = new Set<string>();

    const realAlumnos = alumnos.filter(a => {
      const isMockId = typeof a.id === 'string' && /^al-\d+$/i.test(a.id);
      const isMockMatricula = typeof a.matricula === 'string' && /^UNRC-2026-0(?:0[1-9]|[1-4][0-9]|50)$/i.test(a.matricula.trim());
      if (isMockId || isMockMatricula) {
        if (a.id) purgedIds.add(a.id);
        if (a.matricula) purgedMatriculas.add(a.matricula.trim().toUpperCase());
        return false;
      }
      return true;
    });

    const alumnosEliminados = alumnos.length - realAlumnos.length;
    localStorage.setItem('unrc_alumnos', JSON.stringify(realAlumnos));

    // Clean asistencias
    let asistenciasEliminadas = 0;
    const rawAsist = localStorage.getItem('unrc_asistencias');
    if (rawAsist) {
      try {
        const asistList = JSON.parse(rawAsist);
        if (Array.isArray(asistList)) {
          const cleanAsist = asistList.filter((as: Asistencia) => {
            if (as.id && as.id.startsWith('as-tur-')) return false;
            if (purgedIds.has(as.alumno_id)) return false;
            if (typeof as.alumno_id === 'string' && /^al-\d+$/i.test(as.alumno_id)) return false;
            if (typeof as.alumno_id === 'string' && purgedMatriculas.has(as.alumno_id.toUpperCase())) return false;
            return true;
          });
          asistenciasEliminadas = asistList.length - cleanAsist.length;
          localStorage.setItem('unrc_asistencias', JSON.stringify(cleanAsist));
        }
      } catch (e) {
        console.warn('Error cleaning asistencias:', e);
      }
    }

    // Clean participaciones
    let participacionesEliminadas = 0;
    const rawPart = localStorage.getItem('unrc_participaciones');
    if (rawPart) {
      try {
        const partList = JSON.parse(rawPart);
        if (Array.isArray(partList)) {
          const cleanPart = partList.filter((p: Participacion) => {
            if (purgedIds.has(p.alumno_id)) return false;
            if (typeof p.alumno_id === 'string' && /^al-\d+$/i.test(p.alumno_id)) return false;
            if (typeof p.alumno_id === 'string' && purgedMatriculas.has(p.alumno_id.toUpperCase())) return false;
            return true;
          });
          participacionesEliminadas = partList.length - cleanPart.length;
          localStorage.setItem('unrc_participaciones', JSON.stringify(cleanPart));
        }
      } catch (e) {
        console.warn('Error cleaning participaciones:', e);
      }
    }

    if (supabase && purgedMatriculas.size > 0) {
      try {
        const matriculaArray = Array.from(purgedMatriculas);
        await supabase.from('alumnos').delete().in('matricula', matriculaArray);
      } catch (e) {
        console.warn('Supabase delete mock matriculas notice:', e);
      }
    }

    await db.addAuditoria(
      'PURGA_MATRICULAS_DEMO',
      'Servicios Escolares / Matrículas',
      `Se purgaron ${alumnosEliminados} expedientes demo de prueba y sus registros asociados (${asistenciasEliminadas} asistencias, ${participacionesEliminadas} participaciones)`,
      'Administrador'
    );

    return { alumnosEliminados, asistenciasEliminadas, participacionesEliminadas };
  },

  restoreDefaultAlumnos: async (): Promise<Alumno[]> => {
    localStorage.setItem('unrc_alumnos', JSON.stringify([]));
    await db.limpiarMatriculasFalsas();
    return [];
  },

  updateAlumno: async (id: string, updates: Partial<Alumno>): Promise<Alumno | null> => {
    initLocalStorage();
    let list = await db.getAlumnos();
    const index = list.findIndex(a => a.id === id || a.matricula === id);
    if (index === -1) return null;

    const oldMatricula = list[index].matricula;
    const targetId = list[index].id;
    const newMatricula = updates.matricula ? updates.matricula.trim() : oldMatricula;

    // Permitir editar matrícula libremente para asignar la matrícula oficial
    list[index] = { ...list[index], ...updates, matricula: newMatricula };
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));

    // Si cambió la matrícula, actualizar referencias en asistencias y participaciones
    if (newMatricula !== oldMatricula) {
      try {
        const rawAsist = localStorage.getItem('unrc_asistencias');
        if (rawAsist) {
          const asistList = JSON.parse(rawAsist);
          let asChanged = false;
          asistList.forEach((as: any) => {
            if (as.alumno_id === oldMatricula || as.alumno_id === targetId) {
              as.alumno_id = newMatricula;
              asChanged = true;
            }
          });
          if (asChanged) localStorage.setItem('unrc_asistencias', JSON.stringify(asistList));
        }

        const rawPart = localStorage.getItem('unrc_participaciones');
        if (rawPart) {
          const partList = JSON.parse(rawPart);
          let pChanged = false;
          partList.forEach((p: any) => {
            if (p.alumno_id === oldMatricula || p.alumno_id === targetId) {
              p.alumno_id = newMatricula;
              pChanged = true;
            }
          });
          if (pChanged) localStorage.setItem('unrc_participaciones', JSON.stringify(partList));
        }
      } catch (syncErr) {
        console.warn('Sync matricula notice:', syncErr);
      }
    }

    if (supabase) {
      try {
        const supabasePayload: Record<string, any> = {};
        if (updates.matricula !== undefined) supabasePayload.matricula = newMatricula;
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
        if (updates.sede_id !== undefined) supabasePayload.sede_id = updates.sede_id;
        if (updates.sede_nombre !== undefined) supabasePayload.sede_nombre = updates.sede_nombre;
        if (updates.estado_matricula !== undefined) supabasePayload.estado_matricula = updates.estado_matricula;
        if (updates.ciclo_id !== undefined) supabasePayload.ciclo_id = updates.ciclo_id;
        if (updates.qr_code !== undefined) supabasePayload.qr_code = updates.qr_code;
        if (updates.docente_nombre !== undefined) supabasePayload.docente_nombre = updates.docente_nombre;
        if (updates.docente_id !== undefined) supabasePayload.docente_id = updates.docente_id;
        if (updates.password !== undefined) supabasePayload.password = updates.password;

        if (Object.keys(supabasePayload).length > 0) {
          const { error } = await supabase
            .from('alumnos')
            .update(supabasePayload)
            .or(`id.eq.${targetId},matricula.eq.${oldMatricula}`);
          if (error) {
            console.warn('Supabase update alumno notice:', error.message);
          }
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
    observaciones?: string,
    fecha?: string,
    cursoId?: string,
    materia?: string
  ): Promise<Participacion> => {
    initLocalStorage();
    const alumnos = await db.getAlumnos();
    const alumno = alumnos.find(a => a.id === alumnoId || a.matricula === alumnoId);
    if (!alumno) throw new Error('Alumno no encontrado');

    const puntos = tipo === 'AP' ? 10 : (tipo === 'RP' ? 5 : 7.5);
    const targetDate = fecha || getTijuanaDateString();
    const newPart: Participacion = {
      id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      alumno_id: alumno.id,
      grupo_id: cursoId || alumno.grupo_id,
      curso_id: cursoId,
      materia: materia,
      fecha: targetDate,
      tipo,
      puntos,
      observaciones: observaciones || (tipo === 'AP' ? 'Aprobada: Excelente aportación' : (tipo === 'RP' ? 'Requerido: Por mejorar' : 'Regular: Buena intervención')),
      created_at: new Date().toISOString(),
      alumno
    };

    let list: Participacion[] = JSON.parse(localStorage.getItem('unrc_participaciones') || '[]');
    // Update existing for this student, date and course, or add
    list = list.filter(item => !(item.alumno_id === alumno.id && item.fecha === targetDate && (item.curso_id === cursoId || item.grupo_id === cursoId)));
    list.push(newPart);
    localStorage.setItem('unrc_participaciones', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('participaciones').insert([{
          alumno_id: alumno.id,
          grupo_id: cursoId || alumno.grupo_id,
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

  registrarParticipacionesLote: async (
    registros: Array<{
      alumno_id: string;
      tipo: 'AP' | 'RP' | 'REGULAR' | 'NINGUNA';
      fecha: string;
      curso_id?: string;
      materia?: string;
      observaciones?: string;
    }>
  ): Promise<number> => {
    initLocalStorage();
    const alumnos = await db.getAlumnos();
    let list: Participacion[] = JSON.parse(localStorage.getItem('unrc_participaciones') || '[]');

    registros.forEach(r => {
      // Clean existing on that date & course
      list = list.filter(item => !(item.alumno_id === r.alumno_id && item.fecha === r.fecha && (item.curso_id === r.curso_id || item.grupo_id === r.curso_id)));

      if (r.tipo !== 'NINGUNA') {
        const alumno = alumnos.find(al => al.id === r.alumno_id || al.matricula === r.alumno_id);
        const puntos = r.tipo === 'AP' ? 10 : (r.tipo === 'RP' ? 5 : 7.5);
        list.push({
          id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          alumno_id: r.alumno_id,
          grupo_id: r.curso_id || alumno?.grupo_id,
          curso_id: r.curso_id,
          materia: r.materia,
          fecha: r.fecha,
          tipo: r.tipo,
          puntos,
          observaciones: r.observaciones || (r.tipo === 'AP' ? 'Aprobada: Excelente aportación' : (r.tipo === 'RP' ? 'Requerido: Por mejorar' : 'Regular: Buena intervención')),
          created_at: new Date().toISOString(),
          alumno
        });
      }
    });

    localStorage.setItem('unrc_participaciones', JSON.stringify(list));
    return registros.filter(r => r.tipo !== 'NINGUNA').length;
  },

  eliminarParticipacion: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list: Participacion[] = JSON.parse(localStorage.getItem('unrc_participaciones') || '[]');
    list = list.filter(p => p.id !== id);
    localStorage.setItem('unrc_participaciones', JSON.stringify(list));
    return true;
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

    // Track deleted teacher IDs & blacklist
    let deletedIds: string[] = ['DOC-UNRC-02', 'docente-2', 'b2222222-2222-2222-2222-222222222222'];
    if (typeof window !== 'undefined') {
      const rawDeleted = localStorage.getItem('unrc_deleted_docentes');
      if (rawDeleted) {
        try {
          const parsed = JSON.parse(rawDeleted);
          if (Array.isArray(parsed)) deletedIds = Array.from(new Set([...deletedIds, ...parsed]));
        } catch (e) {}
      }
    }

    const isDocenteDeleted = (dNum?: string, dId?: string, dNom?: string, dPat?: string, dDept?: string, dPuesto?: string) => {
      if (dNum && (dNum.startsWith('BAJA-') || deletedIds.includes(dNum))) return true;
      if (dId && deletedIds.includes(dId)) return true;
      if (dDept && dDept.includes('BAJA')) return true;
      if (dPuesto === 'baja') return true;
      const cleanNom = (dNom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cleanPat = (dPat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cleanNom.includes('beatriz') && cleanPat.includes('sanchez')) return true;
      return false;
    };

    // 1. Try to fetch the single source of truth from Supabase
    let remoteList: Docente[] | null = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('docentes')
          .select('*')
          .order('apellido_paterno', { ascending: true });

        if (!error && data && data.length > 0) {
          remoteList = data
            .filter((sd: any) => !isDocenteDeleted(sd.num_empleado, sd.id, sd.nombre, sd.apellido_paterno, sd.departamento, sd.puesto))
            .map((sd: any) => {
            let parsedHorarios: HorarioDocenteItem[] = [];
            let parsedResumen = sd.horario_resumen || 'Por programar';
            let parsedCarreras: string[] = sd.carreras_asignadas || [];
            let cleanDept = sd.departamento || '';

            if (sd.horarios && Array.isArray(sd.horarios) && sd.horarios.length > 0) {
              parsedHorarios = sd.horarios;
            } else if (cleanDept.includes('@@UNRC_DOC_META@@')) {
              try {
                const parts = cleanDept.split('@@UNRC_DOC_META@@');
                cleanDept = parts[0].trim();
                const meta = JSON.parse(parts[1]);
                if (meta.horarios && Array.isArray(meta.horarios) && meta.horarios.length > 0) {
                  parsedHorarios = meta.horarios;
                  parsedResumen = meta.horario_resumen || parsedResumen;
                  if (meta.carreras_asignadas && Array.isArray(meta.carreras_asignadas)) {
                    parsedCarreras = meta.carreras_asignadas;
                  }
                }
              } catch (e) {
                console.warn('Error parsing @@UNRC_DOC_META@@ in getDocentes:', e);
              }
            }

            const mockMatch = MOCK_DOCENTES.find(m => m.num_empleado === sd.num_empleado || m.email === sd.email);

            // Fallback for demo faculty if no schedule was saved yet
            if (parsedHorarios.length === 0 && mockMatch?.horarios && mockMatch.horarios.length > 0) {
              parsedHorarios = mockMatch.horarios;
              parsedResumen = mockMatch.horario_resumen || parsedResumen;
            }
            if (parsedCarreras.length === 0) {
              parsedCarreras = mockMatch?.carreras_asignadas || [cleanDept || 'Licenciatura'];
            }

            return {
              id: sd.id,
              num_empleado: sd.num_empleado,
              nombre: sd.nombre,
              apellido_paterno: sd.apellido_paterno,
              apellido_materno: sd.apellido_materno || '',
              email: sd.email,
              departamento: cleanDept,
              puesto: sd.puesto || 'docente',
              materias: sd.materias || mockMatch?.materias || [],
              carreras_asignadas: parsedCarreras,
              horario_resumen: parsedResumen,
              horarios: parsedHorarios,
              sede_nombre: sd.sede_nombre || mockMatch?.sede_nombre || 'Campus Tijuana',
              telefono: sd.telefono || mockMatch?.telefono || '',
              foto_url: sd.foto_url || mockMatch?.foto_url,
              password: sd.password || mockMatch?.password || getDefaultUserPassword(sd.num_empleado, '2026-2'),
              created_at: sd.created_at
            };
          });
        }
      } catch (err) {
        console.warn('Docentes fetch from Supabase notice:', err);
      }
    }

    // 2. Read local cache and merge without losing any local modifications or newly added teachers
    const raw = localStorage.getItem('unrc_docentes');
    let localList: Docente[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localList = parsed.filter((ld) => !isDocenteDeleted(ld.num_empleado, ld.id, ld.nombre, ld.apellido_paterno, ld.departamento, ld.puesto));
        }
      } catch (e) {
        console.warn('Error parsing local docentes cache:', e);
      }
    }

    const sanitizeDocenteIntegrity = (list: Docente[]): Docente[] => {
      return list.map(d => {
        if (!d.horarios || d.horarios.length === 0) return d;
        const sanitizedHorarios = d.horarios.map(h => {
          if (
            (h.materia?.toLowerCase().includes('hospedaje') || h.materia?.toLowerCase().includes('hotel')) &&
            (h.grupo?.toLowerCase().includes('phlac') || h.grupo?.toLowerCase().includes('203') || !h.grupo)
          ) {
            return {
              ...h,
              carrera: 'Lic. en Turismo',
              grupo: '201-TUR',
              materia: 'Administración de Empresas de Hospedaje',
              aula: h.aula || 'Aula Virtual UNRC (Google Meet)',
              es_en_linea: Boolean(h.es_en_linea || h.dia?.toLowerCase().includes('sab') || h.dia?.toLowerCase().includes('sáb'))
            };
          }
          return h;
        });
        return { ...d, horarios: sanitizedHorarios };
      });
    };

    let finalList: Docente[] = [];

    if (remoteList && remoteList.length > 0) {
      finalList = sanitizeDocenteIntegrity([...remoteList]);
      // Check if any local teacher was added locally and is not in remote
      localList.forEach((ld) => {
        const inRemoteIdx = finalList.findIndex((rd) => rd.num_empleado === ld.num_empleado || rd.id === ld.id);
        if (inRemoteIdx === -1) {
          finalList.push(ld);
        } else {
          // If local has newer/custom schedules that remote didn't have, keep local's schedule
          if (ld.horarios && ld.horarios.length > 0 && (!finalList[inRemoteIdx].horarios || finalList[inRemoteIdx].horarios.length === 0)) {
            finalList[inRemoteIdx].horarios = ld.horarios;
            finalList[inRemoteIdx].horario_resumen = ld.horario_resumen;
          }
        }
      });
      finalList = sanitizeDocenteIntegrity(finalList);
      localStorage.setItem('unrc_docentes', JSON.stringify(finalList));
      return finalList;
    }

    if (localList.length > 0) {
      const sanitized = sanitizeDocenteIntegrity(localList);
      return sanitized;
    }

    // Fallback seed
    const seeded = sanitizeDocenteIntegrity(MOCK_DOCENTES.map(d => ({
      ...d,
      password: d.password || getDefaultUserPassword(d.num_empleado, '2026-2')
    })));
    localStorage.setItem('unrc_docentes', JSON.stringify(seeded));
    return seeded;
  },

  addDocentesBulk: async (docentes: Omit<Docente, 'id' | 'created_at'>[]): Promise<Docente[]> => {
    initLocalStorage();
    const current = await db.getDocentes();
    const affectedItems: Docente[] = [];

    for (let idx = 0; idx < docentes.length; idx++) {
      const doc = docentes[idx];
      const existingIdx = current.findIndex(d => 
        (d.email && doc.email && d.email.toLowerCase() === doc.email.toLowerCase()) ||
        (d.num_empleado && doc.num_empleado && d.num_empleado.toLowerCase() === doc.num_empleado.toLowerCase())
      );

      if (existingIdx !== -1) {
        // PRESERVE EXISTING HORARIOS AND SUBJECTS
        const existing = current[existingIdx];
        current[existingIdx] = {
          ...existing,
          ...doc,
          horarios: (existing.horarios && existing.horarios.length > 0)
            ? existing.horarios
            : (doc.horarios || []),
          horario_resumen: (existing.horarios && existing.horarios.length > 0)
            ? existing.horario_resumen
            : (doc.horario_resumen || 'Por programar'),
          materias: (existing.materias && existing.materias.length > 0)
            ? existing.materias
            : (doc.materias || [])
        };
        affectedItems.push(current[existingIdx]);
      } else {
        const item: Docente = {
          ...doc,
          password: doc.password || getDefaultUserPassword(doc.num_empleado, '2026-2'),
          id: `docente-${Date.now()}-${idx}`,
          created_at: new Date().toISOString()
        };
        affectedItems.push(item);
        current.push(item);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(current));
    }

    // Persist all affected teachers to Supabase with dual-mode
    if (supabase) {
      for (const d of affectedItems) {
        try {
          const scheduleMeta = {
            horarios: d.horarios || [],
            horario_resumen: d.horario_resumen || 'Por programar',
            carreras_asignadas: d.carreras_asignadas || [d.departamento || 'Licenciatura'],
            sede_nombre: d.sede_nombre || 'Campus Tijuana'
          };
          const baseDept = d.carreras_asignadas?.join(' / ') || d.departamento || 'Campus Tijuana';
          const encodedDept = `${baseDept}\n@@UNRC_DOC_META@@${JSON.stringify(scheduleMeta)}`;

          const { data: upRes } = await supabase
            .from('docentes')
            .update({
              nombre: d.nombre,
              apellido_paterno: d.apellido_paterno,
              apellido_materno: d.apellido_materno || '',
              email: d.email,
              departamento: encodedDept,
              materias: d.materias || [],
              telefono: d.telefono || ''
            })
            .eq('num_empleado', d.num_empleado)
            .select();

          if (!upRes || upRes.length === 0) {
            await supabase.from('docentes').insert([{
              id: d.id,
              num_empleado: d.num_empleado,
              nombre: d.nombre,
              apellido_paterno: d.apellido_paterno,
              apellido_materno: d.apellido_materno || '',
              email: d.email,
              departamento: encodedDept,
              materias: d.materias || [],
              telefono: d.telefono || ''
            }]);
          }
        } catch (e) {
          console.warn('Supabase bulk docente sync notice:', e);
        }
      }
    }

    return affectedItems;
  },

  addHorariosBulk: async (
    items: Array<{
      docenteIdentificador: string;
      carrera?: string;
      materia: string;
      grupo: string;
      dia: string;
      hora_inicio: string;
      hora_fin: string;
      aula?: string;
      es_en_linea?: boolean;
      sede?: string;
    }>
  ): Promise<{ totalSlotsAdded: number; docentesUpdated: number }> => {
    initLocalStorage();
    const docentes = await db.getDocentes();
    let docentesUpdatedCount = 0;
    let totalSlots = 0;

    const slotsByDocente = new Map<string, typeof items>();

    items.forEach((slot) => {
      const cleanIdent = (slot.docenteIdentificador || '').toLowerCase().trim();
      if (!cleanIdent) return;
      const list = slotsByDocente.get(cleanIdent) || [];
      list.push(slot);
      slotsByDocente.set(cleanIdent, list);
    });

    for (const [ident, slots] of slotsByDocente.entries()) {
      const docIdx = docentes.findIndex((d) => {
        const dNom = `${d.nombre} ${d.apellido_paterno} ${d.apellido_materno || ''}`.toLowerCase();
        const dEmp = (d.num_empleado || '').toLowerCase();
        const dEmail = (d.email || '').toLowerCase();
        return dEmp === ident || dEmail === ident || dNom.includes(ident) || ident.includes(d.apellido_paterno.toLowerCase());
      });

      if (docIdx === -1) continue;

      const targetDoc = docentes[docIdx];
      const existingHorarios = targetDoc.horarios || [];
      const newHorarios = [...existingHorarios];

      slots.forEach((s) => {
        const exists = newHorarios.some(
          (h) =>
            h.dia.toLowerCase() === s.dia.toLowerCase() &&
            h.hora_inicio === s.hora_inicio &&
            h.grupo.toLowerCase() === s.grupo.toLowerCase() &&
            h.materia.toLowerCase() === s.materia.toLowerCase()
        );
        if (!exists) {
          newHorarios.push({
            id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dia: s.dia,
            hora_inicio: s.hora_inicio,
            hora_fin: s.hora_fin,
            carrera: s.carrera || targetDoc.carreras_asignadas?.[0] || 'Licenciatura',
            materia: s.materia,
            grupo: s.grupo,
            aula: s.aula || 'Campus Tijuana - Aula Asignada',
            es_en_linea: Boolean(s.es_en_linea),
            sede: s.sede || targetDoc.sede_nombre || 'Campus Tijuana',
          });
          totalSlots++;
        }
      });

      const allMaterias = Array.from(new Set([...(targetDoc.materias || []), ...newHorarios.map((h) => h.materia).filter(Boolean)]));
      const allCarreras = Array.from(new Set([...(targetDoc.carreras_asignadas || []), ...newHorarios.map((h) => h.carrera).filter(Boolean)]));
      const summary = newHorarios
        .map((h) => `${h.dia} (${h.hora_inicio}-${h.hora_fin} hrs • ${h.grupo})`)
        .join(' | ');

      await db.asignarDocenteHorarioCarreras(targetDoc.id, {
        carreras_asignadas: allCarreras,
        materias: allMaterias,
        horario_resumen: summary,
        horarios: newHorarios,
        sede_nombre: targetDoc.sede_nombre,
      });

      docentesUpdatedCount++;
    }

    await db.addAuditoria(
      'CARGA_MASIVA_HORARIOS',
      'Programación Docente',
      `Carga masiva de ${totalSlots} bloques de horarios para ${docentesUpdatedCount} docentes. Persistido en base de datos.`,
      'Control Escolar'
    );

    return { totalSlotsAdded: totalSlots, docentesUpdated: docentesUpdatedCount };
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

  ensureDocenteExists: async (
    rawName: string,
    context?: {
      carreraNombre?: string;
      carreraId?: string;
      grupoClave?: string;
      grupo?: string;
      materiaNombre?: string;
      asignatura?: string;
      sedeNombre?: string;
      sedeId?: string;
    }
  ): Promise<Docente> => {
    initLocalStorage();
    const cleanName = rawName.replace(/^[_\s\-:]+|[_\s\-:]+$/g, '').trim();
    if (!cleanName) throw new Error('Nombre de docente inválido');

    const list = await db.getDocentes();

    // Parse name parts
    const nameWithoutTitle = cleanName.replace(/^(?:Dr|Dra|Mtro|Mtra|Lic|Ing|Prof|Profr|Profra)\.?\s+/i, '').trim();
    const parts = nameWithoutTitle.split(/\s+/).filter(Boolean);
    let nombre = parts[0] || cleanName;
    let apellido_paterno = parts[1] || 'UNRC';
    let apellido_materno = parts.slice(2).join(' ') || '';
    if (parts.length >= 4) {
      nombre = parts.slice(0, 2).join(' ');
      apellido_paterno = parts[2];
      apellido_materno = parts.slice(3).join(' ');
    }

    const normSearch = nameWithoutTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const targetGrupo = context?.grupoClave || context?.grupo;
    const targetMateria = context?.materiaNombre || context?.asignatura;
    const targetCarrera = context?.carreraNombre;
    const targetCarreraId = context?.carreraId;
    const targetSede = context?.sedeNombre || 'Campus Tijuana';
    const targetSedeId = context?.sedeId || 'sede-tij';

    // Search for existing docente
    let existing = list.find((d) => {
      const dFull = `${d.nombre} ${d.apellido_paterno} ${d.apellido_materno || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const dSimple = `${d.nombre} ${d.apellido_paterno}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return dFull.includes(normSearch) || normSearch.includes(dSimple) || dSimple.includes(normSearch);
    });

    if (existing) {
      let updated = false;
      const carrList = existing.carreras_asignadas || [];
      if (targetCarrera && !carrList.includes(targetCarrera)) {
        carrList.push(targetCarrera);
        existing.carreras_asignadas = carrList;
        updated = true;
      }
      const matList = existing.materias || [];
      if (targetMateria && !matList.includes(targetMateria)) {
        matList.push(targetMateria);
        existing.materias = matList;
        updated = true;
      }
      if (updated) {
        await db.updateDocente(existing.id, {
          carreras_asignadas: existing.carreras_asignadas,
          materias: existing.materias
        });
      }
    } else {
      const nextNum = (list.length + 1).toString().padStart(2, '0');
      const num_empleado = `DOC-UNRC-${nextNum}`;
      const cleanEmail = `${nombre.toLowerCase().replace(/\s+/g, '.')}.${apellido_paterno.toLowerCase()}@rcastellanos.cdmx.gob.mx`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const newDocPayload: Omit<Docente, 'id' | 'created_at'> = {
        num_empleado,
        nombre,
        apellido_paterno,
        apellido_materno,
        email: cleanEmail,
        departamento: targetCarrera ? `${targetCarrera} / ${targetSede}` : targetSede,
        puesto: 'docente',
        carreras_asignadas: targetCarrera ? [targetCarrera] : ['Licenciatura UNRC'],
        materias: targetMateria ? [targetMateria] : ['Asignatura Curricular UNRC'],
        horario_resumen: 'Lunes a Sábado (Campus Tijuana)',
        sede_nombre: targetSede,
        sede_id: targetSedeId,
        telefono: '+526641234567',
        foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200'
      };

      existing = await db.addDocente(newDocPayload);
    }

    // ALWAYS INSERT / UPSERT DOCENTE INTO SUPABASE
    if (supabase && existing) {
      try {
        const payloadToUpsert = {
          id: existing.id,
          num_empleado: existing.num_empleado,
          nombre: existing.nombre,
          apellido_paterno: existing.apellido_paterno,
          apellido_materno: existing.apellido_materno || '',
          email: existing.email,
          departamento: existing.departamento || 'Campus Tijuana',
          puesto: existing.puesto || 'docente',
          materias: existing.materias || [],
          carreras_asignadas: existing.carreras_asignadas || [],
          sede_id: existing.sede_id || targetSedeId,
          sede_nombre: existing.sede_nombre || targetSede,
          telefono: existing.telefono || '+526641234567',
          password: existing.password || getDefaultUserPassword(existing.num_empleado, '2026-2')
        };
        await supabase.from('docentes').upsert([payloadToUpsert], { onConflict: 'num_empleado' });

        // Also upsert into profiles (role teacher)
        const profileId = existing.id === 'docente-3' || existing.num_empleado === 'DOC-UNRC-03'
          ? 'd0000003-0000-0000-0000-000000000003'
          : (existing.id.length === 36 ? existing.id : undefined);

        if (profileId) {
          await supabase.from('profiles').upsert([{
            id: profileId,
            full_name: cleanName,
            role: 'teacher',
            email: existing.email,
            avatar_url: existing.foto_url
          }], { onConflict: 'id' });

          await supabase.from('teachers').upsert([{
            profile_id: profileId,
            specialty: existing.departamento || 'Docente UNRC'
          }], { onConflict: 'profile_id' });
        }
      } catch (err) {
        console.warn('Supabase upsert docente notice:', err);
      }
    }

    // Sync group assignment
    if (targetGrupo) {
      const rawGrupos = localStorage.getItem('unrc_grupos');
      let gruposList: Grupo[] = rawGrupos ? JSON.parse(rawGrupos) : MOCK_GRUPOS;
      let grp = gruposList.find((g) => g.clave_grupo.toUpperCase() === targetGrupo.toUpperCase());
      if (grp) {
        grp.docente_nombre = cleanName;
        grp.docente_id = existing.id;
      } else {
        gruposList.push({
          id: `g-${Date.now()}`,
          clave_grupo: targetGrupo,
          carrera_id: targetCarreraId || 'c5555555-5555-5555-5555-555555555555',
          materia_id: 'm1',
          sede_id: targetSedeId,
          sede_nombre: targetSede,
          turno: 'Matutino',
          periodo: '2026-2',
          horario: 'Lunes a Sábado (07:00 - 13:00 hrs)',
          dias_clase: ['Lunes', 'Miércoles', 'Viernes'],
          docente_nombre: cleanName,
          docente_id: existing.id,
          aula: `${targetSede} - Aula ${targetGrupo}`
        });
      }
      localStorage.setItem('unrc_grupos', JSON.stringify(gruposList));
      if (supabase) {
        try {
          await supabase.from('courses').update({ schedule_description: `Docente: ${cleanName}` }).eq('name', targetGrupo);
        } catch (e) {
          // ignore
        }
      }
    }

    return existing;
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
        sede_nombre: updates.sede_nombre || 'Campus Tijuana',
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
        if (updates.carreras_asignadas !== undefined) supabasePayload.carreras_asignadas = updates.carreras_asignadas;
        if (updates.horario_resumen !== undefined) supabasePayload.horario_resumen = updates.horario_resumen;
        if (updates.horarios !== undefined) supabasePayload.horarios = updates.horarios;
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
    const targetId = target ? target.id : id;
    const targetFullName = target ? `${target.nombre} ${target.apellido_paterno}`.toLowerCase() : '';

    list = list.filter(d => d.id !== id && d.num_empleado !== id && d.num_empleado !== targetNum && d.id !== targetId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_docentes', JSON.stringify(list));

      // Register in deleted blacklist so it can NEVER resurrect
      const rawDeleted = localStorage.getItem('unrc_deleted_docentes');
      const deletedList: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      if (targetNum && !deletedList.includes(targetNum)) deletedList.push(targetNum);
      if (targetId && !deletedList.includes(targetId)) deletedList.push(targetId);
      if (id && !deletedList.includes(id)) deletedList.push(id);
      localStorage.setItem('unrc_deleted_docentes', JSON.stringify(deletedList));

      // Clean from groups
      const rawGrupos = localStorage.getItem('unrc_grupos');
      if (rawGrupos) {
        try {
          const gruposParsed: Grupo[] = JSON.parse(rawGrupos);
          const cleanedGrupos = gruposParsed.map(g => {
            const matchesId = g.docente_id === targetId || g.docente_id === id;
            const matchesName = targetFullName && g.docente_nombre && g.docente_nombre.toLowerCase().includes(targetFullName);
            if (matchesId || matchesName) {
              return { ...g, docente_id: undefined, docente_nombre: undefined };
            }
            return g;
          });
          localStorage.setItem('unrc_grupos', JSON.stringify(cleanedGrupos));
        } catch (e) {
          console.warn('Error cleaning grupos on docente delete:', e);
        }
      }
    }

    if (supabase) {
      try {
        // First, update to BAJA_DEFINITIVA so even if RLS denies DELETE, SELECT filter excludes them permanently
        await supabase
          .from('docentes')
          .update({
            num_empleado: `BAJA-${targetNum}-${Date.now()}`,
            departamento: 'BAJA_DEFINITIVA',
            materias: []
          })
          .or(`id.eq.${id},id.eq.${targetId},num_empleado.eq.${targetNum}`);

        await supabase.from('docentes').delete().or(`id.eq.${id},id.eq.${targetId},num_empleado.eq.${targetNum}`);
      } catch (e) {
        console.warn('Supabase docente delete notice:', e);
      }
    }

    if (target) {
      await db.addAuditoria('BAJA_DOCENTE', 'Recursos Humanos / Personal', `Se dio de baja definitiva al docente ${target.nombre} ${target.apellido_paterno} (${targetNum}) y se removió de todos los grupos y horarios.`, 'Administrador');
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
