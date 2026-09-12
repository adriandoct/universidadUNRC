import { createClient } from '@supabase/supabase-js';

// User Roles
export type UserRole = 'alumno' | 'docente' | 'administrador';

// Domain Entities
export interface Carrera {
  id: string;
  clave: string;
  nombre: string;
  nivel: string;
}

export interface Materia {
  id: string;
  carrera_id: string;
  clave: string;
  nombre: string;
  creditos: number;
  semestre: string;
}

export interface Grupo {
  id: string;
  clave_grupo: string;
  carrera_id: string;
  materia_id: string;
  turno: string;
  periodo: string;
  carrera?: Carrera;
  materia?: Materia;
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
  tutor: string;
  telefono: string;
  foto_url?: string;
  qr_code: string;
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
  materias?: string[];
  telefono?: string;
  foto_url?: string;
  created_at?: string;
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
const MOCK_CARRERAS: Carrera[] = [
  { id: 'c1', clave: 'LIC-CDIA', nombre: 'Lic. en Ciencias de Datos e Inteligencia Artificial', nivel: 'Licenciatura' },
  { id: 'c2', clave: 'LIC-TIC', nombre: 'Lic. en Tecnologías de la Información y Comunicación', nivel: 'Licenciatura' },
  { id: 'c3', clave: 'LIC-CIB', nombre: 'Lic. en Ciberseguridad', nivel: 'Licenciatura' }
];

const MOCK_MATERIAS: Materia[] = [
  { id: 'm1', carrera_id: 'c1', clave: 'CDIA-101', nombre: 'Programación Web y Bases de Datos', creditos: 8, semestre: '1° Semestre' },
  { id: 'm2', carrera_id: 'c1', clave: 'CDIA-102', nombre: 'Inteligencia Artificial y Aprendizaje Automático', creditos: 10, semestre: '1° Semestre' },
  { id: 'm3', carrera_id: 'c2', clave: 'TIC-201', nombre: 'Estructura de Datos y Algoritmos', creditos: 8, semestre: '3° Semestre' },
  { id: 'm4', carrera_id: 'c2', clave: 'TIC-301', nombre: 'Ingeniería de Software y Sistemas Web', creditos: 10, semestre: '3° Semestre' },
  { id: 'm5', carrera_id: 'c3', clave: 'CIB-501', nombre: 'Ciberseguridad y Auditoría de Sistemas', creditos: 10, semestre: '5° Semestre' }
];

const MOCK_GRUPOS: Grupo[] = [
  { id: 'g101', clave_grupo: '101', carrera_id: 'c1', materia_id: 'm1', turno: 'Matutino', periodo: '2026-2' },
  { id: 'g102', clave_grupo: '102', carrera_id: 'c1', materia_id: 'm2', turno: 'Matutino', periodo: '2026-2' },
  { id: 'g201', clave_grupo: '201', carrera_id: 'c2', materia_id: 'm3', turno: 'Vespertino', periodo: '2026-2' },
  { id: 'g301', clave_grupo: '301', carrera_id: 'c2', materia_id: 'm4', turno: 'Matutino', periodo: '2026-2' },
  { id: 'g501', clave_grupo: '501', carrera_id: 'c3', materia_id: 'm5', turno: 'Matutino', periodo: '2026-2' }
];

// Initial mock data for UNRC Alumnos (All 44 Parsed Students)
const MOCK_ALUMNOS: Alumno[] = [
  // Group 101
  { id: 'al-1', matricula: 'UNRC-2026-005', nombre: 'Dayanna Gissel', apellido_paterno: 'Buitimea', apellido_materno: 'Garma', grado: '1° Semestre', grupo: '101', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g101', tutor: 'Tutor UNRC', telefono: '+525510000001', qr_code: 'UNRC-2026-005' },
  { id: 'al-2', matricula: 'UNRC-2026-006', nombre: 'Astrid Cristina', apellido_paterno: 'Diaz', apellido_materno: 'Moreno', grado: '1° Semestre', grupo: '101', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g101', tutor: 'Tutor UNRC', telefono: '+525510000002', qr_code: 'UNRC-2026-006' },
  { id: 'al-3', matricula: 'UNRC-2026-007', nombre: 'Julibeth', apellido_paterno: 'Hernandez', apellido_materno: 'Herrera', grado: '1° Semestre', grupo: '101', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g101', tutor: 'Tutor UNRC', telefono: '+525510000003', qr_code: 'UNRC-2026-007' },
  { id: 'al-4', matricula: 'UNRC-2026-008', nombre: 'Blanca Estela', apellido_paterno: 'Lopez', apellido_materno: 'Pablo', grado: '1° Semestre', grupo: '101', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g101', tutor: 'Tutor UNRC', telefono: '+525510000004', qr_code: 'UNRC-2026-008' },
  { id: 'al-5', matricula: 'UNRC-2026-009', nombre: 'Cecilia', apellido_paterno: 'Todd', apellido_materno: 'Ambriz', grado: '1° Semestre', grupo: '101', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g101', tutor: 'Tutor UNRC', telefono: '+525510000005', qr_code: 'UNRC-2026-009' },
  { id: 'al-6', matricula: 'UNRC-2026-010', nombre: 'Alejandra', apellido_paterno: 'Garcia', apellido_materno: 'Hernandez', grado: '1° Semestre', grupo: '101', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g101', tutor: 'Tutor UNRC', telefono: '+525510000006', qr_code: 'UNRC-2026-010' },

  // Group 102
  { id: 'al-7', matricula: 'UNRC-2026-011', nombre: 'Stephanie', apellido_paterno: 'Morales', apellido_materno: 'Flores', grado: '1° Semestre', grupo: '102', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g102', tutor: 'Tutor UNRC', telefono: '+525510000007', qr_code: 'UNRC-2026-011' },
  { id: 'al-8', matricula: 'UNRC-2026-012', nombre: 'Daniel', apellido_paterno: 'Cruz', apellido_materno: 'Mendoza', grado: '1° Semestre', grupo: '102', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g102', tutor: 'Tutor UNRC', telefono: '+525510000008', qr_code: 'UNRC-2026-012' },
  { id: 'al-9', matricula: 'UNRC-2026-013', nombre: 'Giovanni', apellido_paterno: 'Espinoza', apellido_materno: 'Ríos', grado: '1° Semestre', grupo: '102', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g102', tutor: 'Tutor UNRC', telefono: '+525510000009', qr_code: 'UNRC-2026-013' },
  { id: 'al-10', matricula: 'UNRC-2026-014', nombre: 'Edith', apellido_paterno: 'Reyes', apellido_materno: 'Torres', grado: '1° Semestre', grupo: '102', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g102', tutor: 'Tutor UNRC', telefono: '+525510000010', qr_code: 'UNRC-2026-014' },
  { id: 'al-11', matricula: 'UNRC-2026-015', nombre: 'Jose Alberto', apellido_paterno: 'Robles', apellido_materno: 'Anguiano', grado: '1° Semestre', grupo: '102', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g102', tutor: 'Tutor UNRC', telefono: '+525510000011', qr_code: 'UNRC-2026-015' },
  { id: 'al-12', matricula: 'UNRC-2026-016', nombre: 'Daniel', apellido_paterno: 'Ruffo', apellido_materno: 'Vázquez', grado: '1° Semestre', grupo: '102', carrera: 'Lic. en Ciencias de Datos e IA', carrera_id: 'c1', grupo_id: 'g102', tutor: 'Tutor UNRC', telefono: '+525510000012', qr_code: 'UNRC-2026-016' },

  // Group 201
  { id: 'al-13', matricula: 'UNRC-2026-017', nombre: 'Emili Janeht', apellido_paterno: 'Armenta', apellido_materno: 'Mancinas', grado: '3° Semestre', grupo: '201', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g201', tutor: 'Tutor UNRC', telefono: '+525510000013', qr_code: 'UNRC-2026-017' },
  { id: 'al-14', matricula: 'UNRC-2026-018', nombre: 'Quintero Jacobo', apellido_paterno: 'Chrissier', apellido_materno: 'Magdiel', grado: '3° Semestre', grupo: '201', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g201', tutor: 'Tutor UNRC', telefono: '+525510000014', qr_code: 'UNRC-2026-018' },
  { id: 'al-15', matricula: 'UNRC-2026-019', nombre: 'Ivan', apellido_paterno: 'Medina', apellido_materno: 'Silva', grado: '3° Semestre', grupo: '201', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g201', tutor: 'Tutor UNRC', telefono: '+525510000015', qr_code: 'UNRC-2026-019' },
  { id: 'al-16', matricula: 'UNRC-2026-020', nombre: 'Bardo', apellido_paterno: 'Rojo', apellido_materno: 'Castillo', grado: '3° Semestre', grupo: '201', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g201', tutor: 'Tutor UNRC', telefono: '+525510000016', qr_code: 'UNRC-2026-020' },
  { id: 'al-17', matricula: 'UNRC-2026-021', nombre: 'Roselvina Mayeth', apellido_paterno: 'Sanchez', apellido_materno: 'Dominguez', grado: '3° Semestre', grupo: '201', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g201', tutor: 'Tutor UNRC', telefono: '+525510000017', qr_code: 'UNRC-2026-021' },
  { id: 'al-18', matricula: 'UNRC-2026-022', nombre: 'Luis Armando', apellido_paterno: 'Triche', apellido_materno: 'Ramirez', grado: '3° Semestre', grupo: '201', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g201', tutor: 'Tutor UNRC', telefono: '+525510000018', qr_code: 'UNRC-2026-022' },

  // Group 301 (22 Alumnos)
  { id: 'al-19', matricula: 'UNRC-2026-023', nombre: 'Gabriela Erandi', apellido_paterno: 'Capilla', apellido_materno: 'Manuel', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000019', qr_code: 'UNRC-2026-023' },
  { id: 'al-20', matricula: 'UNRC-2026-024', nombre: 'Angélica', apellido_paterno: 'Altamirano', apellido_materno: 'Solórzano', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000020', qr_code: 'UNRC-2026-024' },
  { id: 'al-21', matricula: 'UNRC-2026-025', nombre: 'Magali', apellido_paterno: 'Arce', apellido_materno: 'Garcia', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000021', qr_code: 'UNRC-2026-025' },
  { id: 'al-22', matricula: 'UNRC-2026-026', nombre: 'Michell Evelin', apellido_paterno: 'Cruz', apellido_materno: 'Alcantara', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000022', qr_code: 'UNRC-2026-026' },
  { id: 'al-23', matricula: 'UNRC-2026-027', nombre: 'Michel Monserrat', apellido_paterno: 'De anda', apellido_materno: 'Montalvo', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000023', qr_code: 'UNRC-2026-027' },
  { id: 'al-24', matricula: 'UNRC-2026-028', nombre: 'Samuel Anthony', apellido_paterno: 'De la cruz', apellido_materno: 'López', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000024', qr_code: 'UNRC-2026-028' },
  { id: 'al-25', matricula: 'UNRC-2026-029', nombre: 'Estefanía', apellido_paterno: 'Espinosa', apellido_materno: 'Aguilar', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000025', qr_code: 'UNRC-2026-029' },
  { id: 'al-26', matricula: 'UNRC-2026-030', nombre: 'Maria Dolores', apellido_paterno: 'Garcia', apellido_materno: 'Delgado', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000026', qr_code: 'UNRC-2026-030' },
  { id: 'al-27', matricula: 'UNRC-2026-031', nombre: 'Ana Maria', apellido_paterno: 'Jimenez', apellido_materno: 'Ramirez', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000027', qr_code: 'UNRC-2026-031' },
  { id: 'al-28', matricula: 'UNRC-2026-032', nombre: 'Jaciel Berenice', apellido_paterno: 'Mendoza', apellido_materno: 'Hacho', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000028', qr_code: 'UNRC-2026-032' },
  { id: 'al-29', matricula: 'UNRC-2026-033', nombre: 'Sherlyn de Jesus', apellido_paterno: 'Vergara', apellido_materno: 'Puga', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000029', qr_code: 'UNRC-2026-033' },
  { id: 'al-30', matricula: 'UNRC-2026-034', nombre: 'Francisco Raul', apellido_paterno: 'Riego', apellido_materno: 'Manzano', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000030', qr_code: 'UNRC-2026-034' },
  { id: 'al-31', matricula: 'UNRC-2026-035', nombre: 'Juan Carlos', apellido_paterno: 'Román', apellido_materno: 'Perez', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000031', qr_code: 'UNRC-2026-035' },
  { id: 'al-32', matricula: 'UNRC-2026-036', nombre: 'Diana', apellido_paterno: 'Cruz', apellido_materno: 'Soriano', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000032', qr_code: 'UNRC-2026-036' },
  { id: 'al-33', matricula: 'UNRC-2026-037', nombre: 'Cristian Jeova', apellido_paterno: 'Trejo', apellido_materno: 'Flores', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000033', qr_code: 'UNRC-2026-037' },
  { id: 'al-34', matricula: 'UNRC-2026-038', nombre: 'Jackelyn', apellido_paterno: 'Uribe', apellido_materno: 'Zuñiga', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000034', qr_code: 'UNRC-2026-038' },
  { id: 'al-35', matricula: 'UNRC-2026-039', nombre: 'Angel Alfredo', apellido_paterno: 'Zarate', apellido_materno: 'Cobilt', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000035', qr_code: 'UNRC-2026-039' },
  { id: 'al-36', matricula: 'UNRC-2026-040', nombre: 'Hector', apellido_paterno: 'Rivera', apellido_materno: 'Murillo', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000036', qr_code: 'UNRC-2026-040' },
  { id: 'al-37', matricula: 'UNRC-2026-041', nombre: 'Miguel Ángel', apellido_paterno: 'Romo', apellido_materno: 'Sandoval', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000037', qr_code: 'UNRC-2026-041' },
  { id: 'al-38', matricula: 'UNRC-2026-042', nombre: 'Jessica Lizeth', apellido_paterno: 'Mata', apellido_materno: 'Bautista', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000038', qr_code: 'UNRC-2026-042' },
  { id: 'al-39', matricula: 'UNRC-2026-043', nombre: 'Berenice Malena', apellido_paterno: 'Torres', apellido_materno: 'Reyes', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000039', qr_code: 'UNRC-2026-043' },
  { id: 'al-40', matricula: 'UNRC-2026-044', nombre: 'Lizbeth', apellido_paterno: 'Magallon', apellido_materno: 'Vázquez', grado: '3° Semestre', grupo: '301', carrera: 'Lic. en TIC', carrera_id: 'c2', grupo_id: 'g301', tutor: 'Tutor UNRC', telefono: '+525510000040', qr_code: 'UNRC-2026-044' },

  // Group 501
  { id: 'al-41', matricula: 'UNRC-2026-045', nombre: 'Carlos', apellido_paterno: 'Alcantar', apellido_materno: 'Sanchez', grado: '5° Semestre', grupo: '501', carrera: 'Lic. en Ciberseguridad', carrera_id: 'c3', grupo_id: 'g501', tutor: 'Tutor UNRC', telefono: '+525510000041', qr_code: 'UNRC-2026-045' },
  { id: 'al-42', matricula: 'UNRC-2026-046', nombre: 'Oscar', apellido_paterno: 'Cendejas', apellido_materno: 'Flores', grado: '5° Semestre', grupo: '501', carrera: 'Lic. en Ciberseguridad', carrera_id: 'c3', grupo_id: 'g501', tutor: 'Tutor UNRC', telefono: '+525510000042', qr_code: 'UNRC-2026-046' },
  { id: 'al-43', matricula: 'UNRC-2026-047', nombre: 'José Daniel', apellido_paterno: 'Pérez', apellido_materno: 'Gómez', grado: '5° Semestre', grupo: '501', carrera: 'Lic. en Ciberseguridad', carrera_id: 'c3', grupo_id: 'g501', tutor: 'Tutor UNRC', telefono: '+525510000043', qr_code: 'UNRC-2026-047' },
  { id: 'al-44', matricula: 'UNRC-2026-048', nombre: 'Jazmin', apellido_paterno: 'Guzman', apellido_materno: 'López', grado: '5° Semestre', grupo: '501', carrera: 'Lic. en Ciberseguridad', carrera_id: 'c3', grupo_id: 'g501', tutor: 'Tutor UNRC', telefono: '+525510000044', qr_code: 'UNRC-2026-048' },
  { id: 'al-45', matricula: 'UNRC-2026-049', nombre: 'Dani', apellido_paterno: 'Herrera', apellido_materno: 'Martínez', grado: '5° Semestre', grupo: '501', carrera: 'Lic. en Ciberseguridad', carrera_id: 'c3', grupo_id: 'g501', tutor: 'Tutor UNRC', telefono: '+525510000045', qr_code: 'UNRC-2026-049' },
  { id: 'al-46', matricula: 'UNRC-2026-050', nombre: 'Adad', apellido_paterno: 'Sanchez', apellido_materno: 'Ortiz', grado: '5° Semestre', grupo: '501', carrera: 'Lic. en Ciberseguridad', carrera_id: 'c3', grupo_id: 'g501', tutor: 'Tutor UNRC', telefono: '+525510000046', qr_code: 'UNRC-2026-050' }
];

// Initial Mock Seed for Docentes
const MOCK_DOCENTES: Docente[] = [
  {
    id: 'docente-1',
    num_empleado: 'DOC-UNRC-01',
    nombre: 'Alejandro',
    apellido_paterno: 'Valdez',
    apellido_materno: 'Mendoza',
    email: 'alejandro.valdez@rcastellanos.cdmx.gob.mx',
    departamento: 'Lic. en Ciencias de Datos e IA',
    materias: ['Programación Web y Bases de Datos', 'Inteligencia Artificial'],
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
    materias: ['Estructura de Datos y Algoritmos', 'Ingeniería de Software y Sistemas Web'],
    telefono: '+525588776655',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('unrc_carreras')) {
    localStorage.setItem('unrc_carreras', JSON.stringify(MOCK_CARRERAS));
  }
  if (!localStorage.getItem('unrc_materias')) {
    localStorage.setItem('unrc_materias', JSON.stringify(MOCK_MATERIAS));
  }
  if (!localStorage.getItem('unrc_grupos')) {
    localStorage.setItem('unrc_grupos', JSON.stringify(MOCK_GRUPOS));
  }
  if (!localStorage.getItem('unrc_alumnos')) {
    localStorage.setItem('unrc_alumnos', JSON.stringify(MOCK_ALUMNOS));
  }
  if (!localStorage.getItem('unrc_docentes')) {
    localStorage.setItem('unrc_docentes', JSON.stringify(MOCK_DOCENTES));
  }

  // Seed Participaciones if empty
  if (!localStorage.getItem('unrc_participaciones')) {
    const mockParticipaciones: Participacion[] = [
      { id: 'p1', alumno_id: 'al-2', grupo_id: 'g101', fecha: '2026-09-05', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Excelente aportación en clase' },
      { id: 'p2', alumno_id: 'al-5', grupo_id: 'g101', fecha: '2026-09-05', tipo: 'AP', puntos: 10, observaciones: 'Aprobada: Aportación activa' },
      { id: 'p3', alumno_id: 'al-6', grupo_id: 'g101', fecha: '2026-09-05', tipo: 'RP', puntos: 5, observaciones: 'Requerido: Participación deficiente/incompleta' },
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

  // Seed Asistencias if empty
  if (!localStorage.getItem('unrc_asistencias')) {
    const mockAsistencias: Asistencia[] = [
      { id: 'as-1', alumno_id: 'al-1', grupo_id: 'g101', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '07:05:00', observaciones: 'Presente' },
      { id: 'as-2', alumno_id: 'al-1', grupo_id: 'g101', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:02:00', observaciones: 'Presente' },
      { id: 'as-3', alumno_id: 'al-2', grupo_id: 'g101', tipo: 'entrada', estado: 'A', fecha: '2026-09-02', hora: '07:00:00', observaciones: 'Presente' },
      { id: 'as-4', alumno_id: 'al-2', grupo_id: 'g101', tipo: 'entrada', estado: 'A', fecha: '2026-09-05', hora: '07:01:00', observaciones: 'Presente' },
      { id: 'as-5', alumno_id: 'al-9', grupo_id: 'g102', tipo: 'entrada', estado: 'R', fecha: '2026-09-08', hora: '07:22:00', observaciones: 'Retardo' },
      { id: 'as-6', alumno_id: 'al-10', grupo_id: 'g102', tipo: 'entrada', estado: 'J', fecha: '2026-09-08', hora: '07:00:00', observaciones: 'Justificante médico' },
      { id: 'as-7', alumno_id: 'al-16', grupo_id: 'g201', tipo: 'entrada', estado: 'R', fecha: '2026-09-08', hora: '07:18:00', observaciones: 'Retardo' },
      { id: 'as-8', alumno_id: 'al-16', grupo_id: 'g201', tipo: 'entrada', estado: 'R', fecha: '2026-09-10', hora: '07:15:00', observaciones: 'Retardo' },
      { id: 'as-9', alumno_id: 'al-45', grupo_id: 'g501', tipo: 'entrada', estado: 'J', fecha: '2026-09-11', hora: '07:00:00', observaciones: 'Justificado' }
    ];
    localStorage.setItem('unrc_asistencias', JSON.stringify(mockAsistencias));
  }
};

// Database API Implementation
export const db = {
  isSandboxMode: () => {
    return !isSupabaseConfigured;
  },

  // Carreras operations
  getCarreras: async (): Promise<Carrera[]> => {
    initLocalStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('carreras').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Fallback carreras:', err);
      }
    }
    const raw = localStorage.getItem('unrc_carreras');
    return raw ? JSON.parse(raw) : MOCK_CARRERAS;
  },

  // Materias operations
  getMaterias: async (): Promise<Materia[]> => {
    initLocalStorage();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('materias').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Fallback materias:', err);
      }
    }
    const raw = localStorage.getItem('unrc_materias');
    return raw ? JSON.parse(raw) : MOCK_MATERIAS;
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
    return raw ? JSON.parse(raw) : MOCK_GRUPOS;
  },

  // Alumnos operations
  getAlumnos: async (): Promise<Alumno[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Falling back to local data:', err);
      }
    }
    initLocalStorage();
    const raw = localStorage.getItem('unrc_alumnos');
    const list: Alumno[] = raw ? JSON.parse(raw) : MOCK_ALUMNOS;
    return list.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  },

  getAlumnoByQR: async (qrCode: string): Promise<Alumno | null> => {
    const list = await db.getAlumnos();
    return list.find(a => a.qr_code === qrCode || a.matricula === qrCode) || null;
  },

  addAlumno: async (alumno: Omit<Alumno, 'id' | 'created_at'>): Promise<Alumno> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .insert([{ ...alumno }])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase insert failed, storing locally:', e);
      }
    }
    initLocalStorage();
    const list = await db.getAlumnos();
    const newAlumno: Alumno = {
      ...alumno,
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    list.push(newAlumno);
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));
    return newAlumno;
  },

  addAlumnosBulk: async (alumnos: Omit<Alumno, 'id' | 'created_at'>[]): Promise<Alumno[]> => {
    initLocalStorage();
    const current = await db.getAlumnos();
    const newItems: Alumno[] = [];

    alumnos.forEach((al, idx) => {
      const item: Alumno = {
        ...al,
        id: `student-${Date.now()}-${idx}`,
        created_at: new Date().toISOString()
      };
      newItems.push(item);
      current.push(item);
    });

    localStorage.setItem('unrc_alumnos', JSON.stringify(current));

    if (supabase) {
      try {
        await supabase.from('alumnos').upsert(alumnos, { onConflict: 'matricula' });
      } catch (e) {
        console.warn('Supabase bulk sync notice:', e);
      }
    }

    return newItems;
  },

  deleteAlumno: async (id: string): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('alumnos').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.warn('Supabase delete notice:', e);
      }
    }
    initLocalStorage();
    let list = await db.getAlumnos();
    const initialLen = list.length;
    list = list.filter(a => a.id !== id);
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));
    return list.length < initialLen;
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

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

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
      fecha: new Date().toISOString().split('T')[0],
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
      const totalSesiones = Math.max(alAsistencias.length, 1);
      const sesionScoreSum = alAsistencias.reduce((acc, curr) => {
        if (curr.estado === 'A' || curr.estado === 'J') return acc + 1.0;
        if (curr.estado === 'R') return acc + 0.75;
        return acc;
      }, 0);
      const porcentajeAsistencia = Number(((sesionScoreSum / totalSesiones) * 100).toFixed(2));

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
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('docentes')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Docentes fetch fallback:', err);
      }
    }
    initLocalStorage();
    const raw = localStorage.getItem('unrc_docentes');
    return raw ? JSON.parse(raw) : MOCK_DOCENTES;
  },

  addDocentesBulk: async (docentes: Omit<Docente, 'id' | 'created_at'>[]): Promise<Docente[]> => {
    initLocalStorage();
    const current = await db.getDocentes();
    const newItems: Docente[] = [];

    docentes.forEach((doc, idx) => {
      const item: Docente = {
        ...doc,
        id: `docente-${Date.now()}-${idx}`,
        created_at: new Date().toISOString()
      };
      newItems.push(item);
      current.push(item);
    });

    localStorage.setItem('unrc_docentes', JSON.stringify(current));

    if (supabase) {
      try {
        await supabase.from('docentes').upsert(docentes, { onConflict: 'num_empleado' });
      } catch (e) {
        console.warn('Supabase docentes bulk sync notice:', e);
      }
    }

    return newItems;
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
