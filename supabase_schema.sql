-- ============================================================================
-- Universidad Nacional Rosario Castellanos (UNRC)
-- Supabase / PostgreSQL Database Architecture & Comprehensive Seed Script
-- Fully Idempotent Script with Explicit Columns & Constraint Relaxations
-- ============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CARRERAS (Academic Majors) Table
CREATE TABLE IF NOT EXISTS carreras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clave TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    nivel TEXT DEFAULT 'Licenciatura',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. MATERIAS (Subjects / Courses) Table
CREATE TABLE IF NOT EXISTS materias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    carrera_id UUID REFERENCES carreras(id) ON DELETE CASCADE NOT NULL,
    clave TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    creditos INT DEFAULT 8,
    semestre TEXT DEFAULT '1° Semestre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. GRUPOS (Class Groups) Table
CREATE TABLE IF NOT EXISTS grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clave_grupo TEXT UNIQUE NOT NULL,
    carrera_id UUID REFERENCES carreras(id) ON DELETE CASCADE NOT NULL,
    materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,
    turno TEXT DEFAULT 'Matutino',
    periodo TEXT DEFAULT '2026-2',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ALUMNOS (Students) Table
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matricula TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    carrera_id UUID REFERENCES carreras(id) ON DELETE SET NULL,
    grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
    grado TEXT DEFAULT '1° Semestre',
    grupo TEXT NOT NULL,
    carrera TEXT DEFAULT 'Licenciatura UNRC',
    tutor TEXT DEFAULT 'Tutor Académico UNRC',
    telefono TEXT DEFAULT '+525500000000',
    foto_url TEXT,
    qr_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure foreign keys and relax NOT NULL constraints on pre-existing tables
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS carrera_id UUID REFERENCES carreras(id) ON DELETE SET NULL;
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;
ALTER TABLE alumnos ALTER COLUMN tutor SET DEFAULT 'Tutor Académico UNRC';
ALTER TABLE alumnos ALTER COLUMN tutor DROP NOT NULL;
ALTER TABLE alumnos ALTER COLUMN telefono SET DEFAULT '+525500000000';
ALTER TABLE alumnos ALTER COLUMN telefono DROP NOT NULL;

-- 5. DOCENTES (Teachers / Professors) Table
CREATE TABLE IF NOT EXISTS docentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    num_empleado TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    departamento TEXT NOT NULL DEFAULT 'Tecnologías de la Información',
    materias TEXT[] DEFAULT ARRAY['Programación Web', 'Bases de Datos'],
    foto_url TEXT,
    telefono TEXT DEFAULT '+525500000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ASISTENCIAS (Attendance Records) Table
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado TEXT DEFAULT 'A',
    tipo TEXT DEFAULT 'entrada',
    hora TIME WITHOUT TIME ZONE DEFAULT CURRENT_TIME,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE;
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'A';
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE asistencias ALTER COLUMN tipo SET DEFAULT 'entrada';
ALTER TABLE asistencias ALTER COLUMN tipo DROP NOT NULL;
UPDATE asistencias SET tipo = 'entrada' WHERE tipo IS NULL;

-- 7. PARTICIPACIONES (Class Participation Records) Table
CREATE TABLE IF NOT EXISTS participaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo TEXT NOT NULL CHECK (tipo IN ('AP', 'RP', 'REGULAR')),
    puntos NUMERIC(4,2) DEFAULT 10.00,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE participaciones ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE;

-- 8. TAREAS & ENTREGAS (Assignments & Submissions)
CREATE TABLE IF NOT EXISTS tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    ponderacion NUMERIC(5,2) DEFAULT 20.00,
    fecha_limite DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS entregas_tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE NOT NULL,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    fecha_entrega TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    calificacion NUMERIC(4,2) DEFAULT 10.00,
    estado TEXT DEFAULT 'entregado' CHECK (estado IN ('pendiente', 'entregado', 'calificado', 'retardo')),
    retroalimentacion TEXT,
    UNIQUE(tarea_id, alumno_id)
);

-- 9. PROYECTOS & ENTREGAS (Projects & Submissions)
CREATE TABLE IF NOT EXISTS proyectos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    ponderacion NUMERIC(5,2) DEFAULT 25.00,
    fecha_limite DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS entregas_proyectos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE NOT NULL,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    calificacion NUMERIC(4,2) DEFAULT 10.00,
    estado TEXT DEFAULT 'entregado' CHECK (estado IN ('pendiente', 'entregado', 'calificado')),
    retroalimentacion TEXT,
    UNIQUE(proyecto_id, alumno_id)
);

-- 10. AUTOEVALUACIONES (Self Evaluations)
CREATE TABLE IF NOT EXISTS autoevaluaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
    periodo TEXT DEFAULT 'Parcial 1',
    calificacion NUMERIC(4,2) DEFAULT 10.00,
    reflexion TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(alumno_id, grupo_id, periodo)
);

-- 11. USUARIOS_ROLES Table for Auth & RBAC
CREATE TABLE IF NOT EXISTS usuarios_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('alumno', 'docente', 'administrador')),
    ref_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- HIGH PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_alumnos_grupo_id ON alumnos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_carrera_id ON alumnos(carrera_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno_id ON asistencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_grupo_id ON asistencias(grupo_id);
CREATE INDEX IF NOT EXISTS idx_participaciones_alumno_id ON participaciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_participaciones_grupo_id ON participaciones(grupo_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoevaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read carreras" ON carreras FOR SELECT TO anon USING (true);
CREATE POLICY "Public read materias" ON materias FOR SELECT TO anon USING (true);
CREATE POLICY "Public read grupos" ON grupos FOR SELECT TO anon USING (true);
CREATE POLICY "Public read alumnos" ON alumnos FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert alumnos" ON alumnos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update alumnos" ON alumnos FOR UPDATE TO anon USING (true);
CREATE POLICY "Public delete alumnos" ON alumnos FOR DELETE TO anon USING (true);

CREATE POLICY "Public read asistencias" ON asistencias FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert asistencias" ON asistencias FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update asistencias" ON asistencias FOR UPDATE TO anon USING (true);

CREATE POLICY "Public read participaciones" ON participaciones FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert participaciones" ON participaciones FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public read tareas" ON tareas FOR SELECT TO anon USING (true);
CREATE POLICY "Public read entregas_tareas" ON entregas_tareas FOR SELECT TO anon USING (true);
CREATE POLICY "Public read proyectos" ON proyectos FOR SELECT TO anon USING (true);
CREATE POLICY "Public read entregas_proyectos" ON entregas_proyectos FOR SELECT TO anon USING (true);
CREATE POLICY "Public read autoevaluaciones" ON autoevaluaciones FOR SELECT TO anon USING (true);

-- ==========================================
-- SEED DATA (EXPLICIT TIPO, ESTADO, TUTOR, TELEFONO)
-- ==========================================

-- 1. Insert Carreras
INSERT INTO carreras (id, clave, nombre, nivel) VALUES
    ('c1111111-1111-1111-1111-111111111111', 'LIC-CDIA', 'Licenciatura en Ciencias de Datos e Inteligencia Artificial', 'Licenciatura'),
    ('c2222222-2222-2222-2222-222222222222', 'LIC-TIC', 'Licenciatura en Tecnologías de la Información y Comunicación', 'Licenciatura'),
    ('c3333333-3333-3333-3333-333333333333', 'LIC-CIB', 'Licenciatura en Ciberseguridad', 'Licenciatura')
ON CONFLICT (clave) DO NOTHING;

-- 2. Insert Materias
INSERT INTO materias (id, carrera_id, clave, nombre, creditos, semestre) VALUES
    ('f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'CDIA-101', 'Programación Web y Bases de Datos', 8, '1° Semestre'),
    ('f2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'CDIA-102', 'Inteligencia Artificial y Aprendizaje Automático', 10, '1° Semestre'),
    ('f3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'TIC-201', 'Estructura de Datos y Algoritmos', 8, '3° Semestre'),
    ('f4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'TIC-301', 'Ingeniería de Software y Sistemas Web', 10, '3° Semestre'),
    ('f5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 'CIB-501', 'Ciberseguridad y Auditoría de Sistemas', 10, '5° Semestre')
ON CONFLICT (clave) DO NOTHING;

-- 3. Insert Grupos
INSERT INTO grupos (id, clave_grupo, carrera_id, materia_id, turno, periodo) VALUES
    ('e1010000-0000-0000-0000-000000000101', '101', 'c1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'Matutino', '2026-2'),
    ('e1020000-0000-0000-0000-000000000102', '102', 'c1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 'Matutino', '2026-2'),
    ('e2010000-0000-0000-0000-000000000201', '201', 'c2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 'Vespertino', '2026-2'),
    ('e3010000-0000-0000-0000-000000000301', '301', 'c2222222-2222-2222-2222-222222222222', 'f4444444-4444-4444-4444-444444444444', 'Matutino', '2026-2'),
    ('e5010000-0000-0000-0000-000000000501', '501', 'c3333333-3333-3333-3333-333333333333', 'f5555555-5555-5555-5555-555555555555', 'Matutino', '2026-2')
ON CONFLICT (clave_grupo) DO NOTHING;

-- 4. Insert ALL 44 STUDENTS
INSERT INTO alumnos (id, matricula, nombre, apellido_paterno, apellido_materno, carrera_id, grupo_id, grado, grupo, carrera, tutor, telefono, qr_code) VALUES
    -- GRUPO 101 (6 Alumnos)
    ('a0000001-0000-0000-0000-000000000001', 'UNRC-2026-005', 'Dayanna Gissel', 'Buitimea', 'Garma', 'c1111111-1111-1111-1111-111111111111', 'e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-005'),
    ('a0000002-0000-0000-0000-000000000002', 'UNRC-2026-006', 'Astrid Cristina', 'Diaz', 'Moreno', 'c1111111-1111-1111-1111-111111111111', 'e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-006'),
    ('a0000003-0000-0000-0000-000000000003', 'UNRC-2026-007', 'Julibeth', 'Hernandez', 'Herrera', 'c1111111-1111-1111-1111-111111111111', 'e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-007'),
    ('a0000004-0000-0000-0000-000000000004', 'UNRC-2026-008', 'Blanca Estela', 'Lopez', 'Pablo', 'c1111111-1111-1111-1111-111111111111', 'e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-008'),
    ('a0000005-0000-0000-0000-000000000005', 'UNRC-2026-009', 'Cecilia', 'Todd', 'Ambriz', 'c1111111-1111-1111-1111-111111111111', 'e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-009'),
    ('a0000006-0000-0000-0000-000000000006', 'UNRC-2026-010', 'Alejandra', 'Garcia', 'Hernandez', 'c1111111-1111-1111-1111-111111111111', 'e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-010'),

    -- GRUPO 102 (6 Alumnos)
    ('a0000007-0000-0000-0000-000000000007', 'UNRC-2026-011', 'Stephanie', 'Morales', 'Flores', 'c1111111-1111-1111-1111-111111111111', 'e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-011'),
    ('a0000008-0000-0000-0000-000000000008', 'UNRC-2026-012', 'Daniel', 'Cruz', 'Mendoza', 'c1111111-1111-1111-1111-111111111111', 'e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-012'),
    ('a0000009-0000-0000-0000-000000000009', 'UNRC-2026-013', 'Giovanni', 'Espinoza', 'Ríos', 'c1111111-1111-1111-1111-111111111111', 'e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-013'),
    ('a0000010-0000-0000-0000-000000000010', 'UNRC-2026-014', 'Edith', 'Reyes', 'Torres', 'c1111111-1111-1111-1111-111111111111', 'e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-014'),
    ('a0000011-0000-0000-0000-000000000011', 'UNRC-2026-015', 'Jose Alberto', 'Robles', 'Anguiano', 'c1111111-1111-1111-1111-111111111111', 'e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-015'),
    ('a0000012-0000-0000-0000-000000000012', 'UNRC-2026-016', 'Daniel', 'Ruffo', 'Vázquez', 'c1111111-1111-1111-1111-111111111111', 'e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'Licenciatura en Ciencias de Datos e IA', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-016'),

    -- GRUPO 201 (6 Alumnos)
    ('a0000013-0000-0000-0000-000000000013', 'UNRC-2026-017', 'Emili Janeht', 'Armenta', 'Mancinas', 'c2222222-2222-2222-2222-222222222222', 'e2010000-0000-0000-0000-000000000201', '3° Semestre', '201', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-017'),
    ('a0000014-0000-0000-0000-000000000014', 'UNRC-2026-018', 'Quintero Jacobo', 'Chrissier', 'Magdiel', 'c2222222-2222-2222-2222-222222222222', 'e2010000-0000-0000-0000-000000000201', '3° Semestre', '201', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-018'),
    ('a0000015-0000-0000-0000-000000000015', 'UNRC-2026-019', 'Ivan', 'Medina', 'Silva', 'c2222222-2222-2222-2222-222222222222', 'e2010000-0000-0000-0000-000000000201', '3° Semestre', '201', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-019'),
    ('a0000016-0000-0000-0000-000000000016', 'UNRC-2026-020', 'Bardo', 'Rojo', 'Castillo', 'c2222222-2222-2222-2222-222222222222', 'e2010000-0000-0000-0000-000000000201', '3° Semestre', '201', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-020'),
    ('a0000017-0000-0000-0000-000000000017', 'UNRC-2026-021', 'Roselvina Mayeth', 'Sanchez', 'Dominguez', 'c2222222-2222-2222-2222-222222222222', 'e2010000-0000-0000-0000-000000000201', '3° Semestre', '201', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-021'),
    ('a0000018-0000-0000-0000-000000000018', 'UNRC-2026-022', 'Luis Armando', 'Triche', 'Ramirez', 'c2222222-2222-2222-2222-222222222222', 'e2010000-0000-0000-0000-000000000201', '3° Semestre', '201', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-022'),

    -- GRUPO 301 (22 Alumnos)
    ('a0000019-0000-0000-0000-000000000019', 'UNRC-2026-023', 'Gabriela Erandi', 'Capilla', 'Manuel', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-023'),
    ('a0000020-0000-0000-0000-000000000020', 'UNRC-2026-024', 'Angélica', 'Altamirano', 'Solórzano', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-024'),
    ('a0000021-0000-0000-0000-000000000021', 'UNRC-2026-025', 'Magali', 'Arce', 'Garcia', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-025'),
    ('a0000022-0000-0000-0000-000000000022', 'UNRC-2026-026', 'Michell Evelin', 'Cruz', 'Alcantara', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-026'),
    ('a0000023-0000-0000-0000-000000000023', 'UNRC-2026-027', 'Michel Monserrat', 'De anda', 'Montalvo', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-027'),
    ('a0000024-0000-0000-0000-000000000024', 'UNRC-2026-028', 'Samuel Anthony', 'De la cruz', 'López', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-028'),
    ('a0000025-0000-0000-0000-000000000025', 'UNRC-2026-029', 'Estefanía', 'Espinosa', 'Aguilar', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-029'),
    ('a0000026-0000-0000-0000-000000000026', 'UNRC-2026-030', 'Maria Dolores', 'Garcia', 'Delgado', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-030'),
    ('a0000027-0000-0000-0000-000000000027', 'UNRC-2026-031', 'Ana Maria', 'Jimenez', 'Ramirez', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-031'),
    ('a0000028-0000-0000-0000-000000000028', 'UNRC-2026-032', 'Jaciel Berenice', 'Mendoza', 'Hacho', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-032'),
    ('a0000029-0000-0000-0000-000000000029', 'UNRC-2026-033', 'Sherlyn de Jesus', 'Vergara', 'Puga', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-033'),
    ('a0000030-0000-0000-0000-000000000030', 'UNRC-2026-034', 'Francisco Raul', 'Riego', 'Manzano', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-034'),
    ('a0000031-0000-0000-0000-000000000031', 'UNRC-2026-035', 'Juan Carlos', 'Román', 'Perez', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-035'),
    ('a0000032-0000-0000-0000-000000000032', 'UNRC-2026-036', 'Diana', 'Cruz', 'Soriano', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-036'),
    ('a0000033-0000-0000-0000-000000000033', 'UNRC-2026-037', 'Cristian Jeova', 'Trejo', 'Flores', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-037'),
    ('a0000034-0000-0000-0000-000000000034', 'UNRC-2026-038', 'Jackelyn', 'Uribe', 'Zuñiga', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-038'),
    ('a0000035-0000-0000-0000-000000000035', 'UNRC-2026-039', 'Angel Alfredo', 'Zarate', 'Cobilt', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-039'),
    ('a0000036-0000-0000-0000-000000000036', 'UNRC-2026-040', 'Hector', 'Rivera', 'Murillo', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-040'),
    ('a0000037-0000-0000-0000-000000000037', 'UNRC-2026-041', 'Miguel Ángel', 'Romo', 'Sandoval', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-041'),
    ('a0000038-0000-0000-0000-000000000038', 'UNRC-2026-042', 'Jessica Lizeth', 'Mata', 'Bautista', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-042'),
    ('a0000039-0000-0000-0000-000000000039', 'UNRC-2026-043', 'Berenice Malena', 'Torres', 'Reyes', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-043'),
    ('a0000040-0000-0000-0000-000000000040', 'UNRC-2026-044', 'Lizbeth', 'Magallon', 'Vázquez', 'c2222222-2222-2222-2222-222222222222', 'e3010000-0000-0000-0000-000000000301', '3° Semestre', '301', 'Licenciatura en TIC', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-044'),

    -- GRUPO 501 (6 Alumnos)
    ('a0000041-0000-0000-0000-000000000041', 'UNRC-2026-045', 'Carlos', 'Alcantar', 'Sanchez', 'c3333333-3333-3333-3333-333333333333', 'e5010000-0000-0000-0000-000000000501', '5° Semestre', '501', 'Licenciatura en Ciberseguridad', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-045'),
    ('a0000042-0000-0000-0000-000000000042', 'UNRC-2026-046', 'Oscar', 'Cendejas', 'Flores', 'c3333333-3333-3333-3333-333333333333', 'e5010000-0000-0000-0000-000000000501', '5° Semestre', '501', 'Licenciatura en Ciberseguridad', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-046'),
    ('a0000043-0000-0000-0000-000000000047', 'UNRC-2026-047', 'José Daniel', 'Pérez', 'Gómez', 'c3333333-3333-3333-3333-333333333333', 'e5010000-0000-0000-0000-000000000501', '5° Semestre', '501', 'Licenciatura en Ciberseguridad', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-047'),
    ('a0000044-0000-0000-0000-000000000048', 'UNRC-2026-048', 'Jazmin', 'Guzman', 'López', 'c3333333-3333-3333-3333-333333333333', 'e5010000-0000-0000-0000-000000000501', '5° Semestre', '501', 'Licenciatura en Ciberseguridad', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-048'),
    ('a0000045-0000-0000-0000-000000000049', 'UNRC-2026-049', 'Dani', 'Herrera', 'Martínez', 'c3333333-3333-3333-3333-333333333333', 'e5010000-0000-0000-0000-000000000501', '5° Semestre', '501', 'Licenciatura en Ciberseguridad', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-049'),
    ('a0000046-0000-0000-0000-000000000050', 'UNRC-2026-050', 'Adad', 'Sanchez', 'Ortiz', 'c3333333-3333-3333-3333-333333333333', 'e5010000-0000-0000-0000-000000000501', '5° Semestre', '501', 'Licenciatura en Ciberseguridad', 'Tutor Académico UNRC', '+525500000000', 'UNRC-2026-050')
ON CONFLICT (matricula) DO NOTHING;

-- 5. Insert ASISTENCIAS Seed Data (Explicit tipo, estado, observaciones)
INSERT INTO asistencias (alumno_id, grupo_id, fecha, tipo, estado, observaciones) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'e1010000-0000-0000-0000-000000000101', '2026-09-02', 'entrada', 'A', 'Asistencia'),
    ('a0000001-0000-0000-0000-000000000001', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'entrada', 'A', 'Asistencia'),
    ('a0000002-0000-0000-0000-000000000002', 'e1010000-0000-0000-0000-000000000101', '2026-09-02', 'entrada', 'A', 'Asistencia'),
    ('a0000002-0000-0000-0000-000000000002', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'entrada', 'A', 'Asistencia'),
    ('a0000003-0000-0000-0000-000000000003', 'e1010000-0000-0000-0000-000000000101', '2026-09-02', 'entrada', 'A', 'Asistencia'),
    ('a0000003-0000-0000-0000-000000000003', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'entrada', 'A', 'Asistencia'),
    ('a0000004-0000-0000-0000-000000000004', 'e1010000-0000-0000-0000-000000000101', '2026-09-02', 'entrada', 'A', 'Asistencia'),
    ('a0000004-0000-0000-0000-000000000004', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'entrada', 'A', 'Asistencia'),
    ('a0000005-0000-0000-0000-000000000005', 'e1010000-0000-0000-0000-000000000101', '2026-09-02', 'entrada', 'A', 'Asistencia'),
    ('a0000005-0000-0000-0000-000000000005', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'entrada', 'A', 'Asistencia'),
    ('a0000006-0000-0000-0000-000000000006', 'e1010000-0000-0000-0000-000000000101', '2026-09-02', 'entrada', 'A', 'Asistencia'),
    ('a0000006-0000-0000-0000-000000000006', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'entrada', 'A', 'Asistencia'),

    ('a0000007-0000-0000-0000-000000000007', 'e1020000-0000-0000-0000-000000000102', '2026-09-08', 'entrada', 'A', 'Asistencia'),
    ('a0000007-0000-0000-0000-000000000007', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000008-0000-0000-0000-000000000008', 'e1020000-0000-0000-0000-000000000102', '2026-09-08', 'entrada', 'A', 'Asistencia'),
    ('a0000008-0000-0000-0000-000000000008', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000009-0000-0000-0000-000000000009', 'e1020000-0000-0000-0000-000000000102', '2026-09-08', 'entrada', 'R', 'Retardo'),
    ('a0000009-0000-0000-0000-000000000009', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000010-0000-0000-0000-000000000010', 'e1020000-0000-0000-0000-000000000102', '2026-09-08', 'entrada', 'J', 'Justificante'),
    ('a0000010-0000-0000-0000-000000000010', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000011-0000-0000-0000-000000000011', 'e1020000-0000-0000-0000-000000000102', '2026-09-08', 'entrada', 'R', 'Retardo'),
    ('a0000011-0000-0000-0000-000000000011', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000012-0000-0000-0000-000000000012', 'e1020000-0000-0000-0000-000000000102', '2026-09-08', 'entrada', 'A', 'Asistencia'),
    ('a0000012-0000-0000-0000-000000000012', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'entrada', 'A', 'Asistencia'),

    ('a0000013-0000-0000-0000-000000000013', 'e2010000-0000-0000-0000-000000000201', '2026-09-08', 'entrada', 'A', 'Asistencia'),
    ('a0000013-0000-0000-0000-000000000013', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000014-0000-0000-0000-000000000014', 'e2010000-0000-0000-0000-000000000201', '2026-09-08', 'entrada', 'A', 'Asistencia'),
    ('a0000014-0000-0000-0000-000000000014', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000015-0000-0000-0000-000000000015', 'e2010000-0000-0000-0000-000000000201', '2026-09-08', 'entrada', 'R', 'Retardo'),
    ('a0000015-0000-0000-0000-000000000015', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000016-0000-0000-0000-000000000016', 'e2010000-0000-0000-0000-000000000201', '2026-09-08', 'entrada', 'R', 'Retardo'),
    ('a0000016-0000-0000-0000-000000000016', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'entrada', 'R', 'Retardo'),
    ('a0000017-0000-0000-0000-000000000017', 'e2010000-0000-0000-0000-000000000201', '2026-09-08', 'entrada', 'A', 'Asistencia'),
    ('a0000017-0000-0000-0000-000000000017', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'entrada', 'A', 'Asistencia'),
    ('a0000018-0000-0000-0000-000000000018', 'e2010000-0000-0000-0000-000000000201', '2026-09-08', 'entrada', 'R', 'Retardo'),
    ('a0000018-0000-0000-0000-000000000018', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'entrada', 'A', 'Asistencia'),

    ('a0000019-0000-0000-0000-000000000019', 'e3010000-0000-0000-0000-000000000301', '2026-09-02', 'entrada', 'A', 'Presente'),
    ('a0000019-0000-0000-0000-000000000019', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'entrada', 'A', 'Presente'),
    ('a0000019-0000-0000-0000-000000000019', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'entrada', 'A', 'Presente'),
    ('a0000020-0000-0000-0000-000000000020', 'e3010000-0000-0000-0000-000000000301', '2026-09-02', 'entrada', 'A', 'Presente'),
    ('a0000020-0000-0000-0000-000000000020', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'entrada', 'A', 'Presente'),
    ('a0000020-0000-0000-0000-000000000020', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'entrada', 'A', 'Presente'),
    ('a0000021-0000-0000-0000-000000000021', 'e3010000-0000-0000-0000-000000000301', '2026-09-02', 'entrada', 'A', 'Presente'),
    ('a0000021-0000-0000-0000-000000000021', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'entrada', 'A', 'Presente'),
    ('a0000021-0000-0000-0000-000000000021', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'entrada', 'A', 'Presente'),
    ('a0000022-0000-0000-0000-000000000022', 'e3010000-0000-0000-0000-000000000301', '2026-09-02', 'entrada', 'A', 'Presente'),
    ('a0000022-0000-0000-0000-000000000022', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'entrada', 'A', 'Presente'),
    ('a0000022-0000-0000-0000-000000000022', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'entrada', 'A', 'Presente'),

    ('a0000041-0000-0000-0000-000000000041', 'e5010000-0000-0000-0000-000000000501', '2026-09-03', 'entrada', 'A', 'Presente'),
    ('a0000041-0000-0000-0000-000000000041', 'e5010000-0000-0000-0000-000000000501', '2026-09-07', 'entrada', 'A', 'Presente'),
    ('a0000041-0000-0000-0000-000000000041', 'e5010000-0000-0000-0000-000000000501', '2026-09-11', 'entrada', 'A', 'Presente'),
    ('a0000045-0000-0000-0000-000000000049', 'e5010000-0000-0000-0000-000000000501', '2026-09-03', 'entrada', 'A', 'Presente'),
    ('a0000045-0000-0000-0000-000000000049', 'e5010000-0000-0000-0000-000000000501', '2026-09-07', 'entrada', 'A', 'Presente'),
    ('a0000045-0000-0000-0000-000000000049', 'e5010000-0000-0000-0000-000000000501', '2026-09-11', 'entrada', 'J', 'Justificado')
ON CONFLICT DO NOTHING;

-- 6. Insert PARTICIPACIONES Seed Data
INSERT INTO participaciones (alumno_id, grupo_id, fecha, tipo, puntos, observaciones) VALUES
    ('a0000002-0000-0000-0000-000000000002', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'AP', 10.00, 'Aprobada: Excelente aportación'),
    ('a0000005-0000-0000-0000-000000000005', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'AP', 10.00, 'Aprobada: Aportación activa'),
    ('a0000006-0000-0000-0000-000000000006', 'e1010000-0000-0000-0000-000000000101', '2026-09-05', 'RP', 5.00, 'Requerido: Participación deficiente'),
    ('a0000007-0000-0000-0000-000000000007', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'AP', 10.00, 'Aprobada: Exposición clara'),
    ('a0000008-0000-0000-0000-000000000008', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'AP', 10.00, 'Aprobada: Ejercicio en pizarrón'),
    ('a0000009-0000-0000-0000-000000000009', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'AP', 10.00, 'Aprobada: Debate de IA'),
    ('a0000010-0000-0000-0000-000000000010', 'e1020000-0000-0000-0000-000000000102', '2026-09-10', 'AP', 10.00, 'Aprobada'),
    ('a0000014-0000-0000-0000-000000000014', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'AP', 10.00, 'Aprobada'),
    ('a0000015-0000-0000-0000-000000000015', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'AP', 10.00, 'Aprobada'),
    ('a0000016-0000-0000-0000-000000000016', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'RP', 5.00, 'Requerido: Repaso recomendado'),
    ('a0000018-0000-0000-0000-000000000018', 'e2010000-0000-0000-0000-000000000201', '2026-09-10', 'AP', 10.00, 'Aprobada'),
    ('a0000019-0000-0000-0000-000000000019', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'AP', 10.00, 'Aprobada'),
    ('a0000019-0000-0000-0000-000000000019', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada'),
    ('a0000020-0000-0000-0000-000000000020', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'AP', 10.00, 'Aprobada'),
    ('a0000021-0000-0000-0000-000000000021', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'RP', 5.00, 'Requerido'),
    ('a0000022-0000-0000-0000-000000000022', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada'),
    ('a0000025-0000-0000-0000-000000000025', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada'),
    ('a0000026-0000-0000-0000-000000000026', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada'),
    ('a0000029-0000-0000-0000-000000000029', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada'),
    ('a0000030-0000-0000-0000-000000000030', 'e3010000-0000-0000-0000-000000000301', '2026-09-05', 'AP', 10.00, 'Aprobada'),
    ('a0000034-0000-0000-0000-000000000034', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada'),
    ('a0000036-0000-0000-0000-000000000036', 'e3010000-0000-0000-0000-000000000301', '2026-09-09', 'AP', 10.00, 'Aprobada')
ON CONFLICT DO NOTHING;

-- 7. OPTIMIZED ACADEMIC RESUMEN VIEW
CREATE OR REPLACE VIEW vw_resumen_academico AS
WITH stats_asistencia AS (
    SELECT 
        alumno_id,
        COUNT(id) AS total_sesiones,
        SUM(CASE WHEN estado IN ('A', 'J') THEN 1.0 WHEN estado = 'R' THEN 0.75 ELSE 0.0 END) AS score_sum
    FROM asistencias
    GROUP BY alumno_id
),
stats_participacion AS (
    SELECT 
        alumno_id,
        ROUND(AVG(puntos), 2) AS avg_puntos
    FROM participaciones
    GROUP BY alumno_id
)
SELECT 
    al.id AS alumno_id,
    al.matricula,
    CONCAT(al.nombre, ' ', al.apellido_paterno, ' ', al.apellido_materno) AS nombre_completo,
    COALESCE(c.nombre, al.carrera) AS carrera,
    COALESCE(m.nombre, 'Materia General') AS materia,
    al.grupo,
    -- Attendance Percentage (Weight 20%)
    COALESCE(ROUND((sa.score_sum / NULLIF(sa.total_sesiones, 0)) * 100, 2), 100.00) AS porcentaje_asistencia,
    -- Participation Score (Weight 20%)
    COALESCE(sp.avg_puntos, 10.00) AS promedio_participacion,
    -- Tasks Score (Weight 20%)
    10.00 AS promedio_tareas,
    -- Project Score (Weight 25%)
    10.00 AS promedio_proyectos,
    -- Self Evaluation Score (Weight 15%)
    10.00 AS autoevaluacion,
    -- Final Calculated Grade (0 - 10)
    ROUND(
        (COALESCE((sa.score_sum / NULLIF(sa.total_sesiones, 0)), 1.0) * 2.0) +
        (COALESCE(sp.avg_puntos, 10.0) / 10.0 * 2.0) +
        (10.0 / 10.0 * 2.0) +
        (10.0 / 10.0 * 2.5) +
        (10.0 / 10.0 * 1.5), 
        2
    ) AS calificacion_final
FROM alumnos al
LEFT JOIN grupos g ON al.grupo_id = g.id
LEFT JOIN materias m ON g.materia_id = m.id
LEFT JOIN carreras c ON al.carrera_id = c.id
LEFT JOIN stats_asistencia sa ON al.id = sa.alumno_id
LEFT JOIN stats_participacion sp ON al.id = sp.alumno_id;
