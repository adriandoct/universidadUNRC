-- ============================================================================
-- ACADEOVA SCHOOLAPP / UNRC ERP ESCOLAR - COMPREHENSIVE SUPABASE DDL SCHEMA
-- PostgreSQL Architecture with RLS, Enums, Foreign Keys & Triggers
-- ============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS DEFINITIONS
-- ==========================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'guardian');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. CORE TABLES DEFINITIONS
-- ==========================================

-- 2.1 PROFILES (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    email TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 ACADEMIC YEARS (Ciclos Escolares)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 GRADES & SECTIONS (Grados y Secciones/Grupos)
CREATE TABLE IF NOT EXISTS public.grades_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_level TEXT NOT NULL, -- e.g., '1° Semestre', '2° Semestre'
    section_name TEXT NOT NULL, -- e.g., '101', '201-TUR'
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(grade_level, section_name, academic_year_id)
);

-- 2.4 GUARDIANS (Padres / Tutores Legales)
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    phone TEXT,
    id_card TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 STUDENTS (Estudiantes)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    student_code TEXT UNIQUE NOT NULL, -- Matrícula e.g. UNRC-2026-005
    grade_section_id UUID REFERENCES public.grades_sections(id) ON DELETE SET NULL,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5.1 ALUMNOS (Registro Detallado de Control Escolar y Expedientes UNRC)
CREATE TABLE IF NOT EXISTS public.alumnos (
    id TEXT PRIMARY KEY DEFAULT ('student-' || gen_random_uuid()::text),
    matricula TEXT UNIQUE NOT NULL, -- Clave escolar e.g. UNRC-2026-051
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    grado TEXT NOT NULL, -- e.g. '1° Semestre', '2° Semestre'
    grupo TEXT NOT NULL, -- e.g. '101', '201-TUR', '203-ADM'
    carrera TEXT DEFAULT 'Licenciatura UNRC',
    carrera_id TEXT,
    grupo_id TEXT,
    sede_id TEXT DEFAULT 'sede-tij',
    sede_nombre TEXT DEFAULT 'Campus Tijuana',
    ciclo_id TEXT DEFAULT 'ciclo-2026-2',
    estado_matricula TEXT DEFAULT 'activo', -- 'activo', 'baja_temporal', 'egresado', 'aspirante'
    tutor TEXT DEFAULT 'Tutor Registrado',
    telefono TEXT DEFAULT '+525500000000',
    foto_url TEXT,
    qr_code TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantizar que las columnas institucionales existan en bases de datos existentes sin borrar datos:
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS sede_id TEXT DEFAULT 'sede-tij';
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS sede_nombre TEXT DEFAULT 'Campus Tijuana';
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS ciclo_id TEXT DEFAULT 'ciclo-2026-2';
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS estado_matricula TEXT DEFAULT 'activo';
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS docente_nombre TEXT;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS docente_id TEXT;

-- Tabla de Docentes para personal académico
CREATE TABLE IF NOT EXISTS public.docentes (
    id TEXT PRIMARY KEY DEFAULT ('docente-' || gen_random_uuid()::text),
    num_empleado TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    email TEXT,
    departamento TEXT DEFAULT 'Campus Tijuana',
    puesto TEXT DEFAULT 'docente',
    materias TEXT[],
    carreras_asignadas TEXT[],
    sede_id TEXT DEFAULT 'sede-tij',
    sede_nombre TEXT DEFAULT 'Campus Tijuana',
    telefono TEXT DEFAULT '+526641234567',
    horario_resumen TEXT,
    horarios JSONB DEFAULT '[]'::jsonb,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Columnas de horarios y asignación académica para docentes:
ALTER TABLE public.docentes ADD COLUMN IF NOT EXISTS horario_resumen TEXT;
ALTER TABLE public.docentes ADD COLUMN IF NOT EXISTS horarios JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.docentes ADD COLUMN IF NOT EXISTS carreras_asignadas TEXT[];
ALTER TABLE public.docentes ADD COLUMN IF NOT EXISTS sede_id TEXT DEFAULT 'sede-tij';
ALTER TABLE public.docentes ADD COLUMN IF NOT EXISTS sede_nombre TEXT DEFAULT 'Campus Tijuana';

-- Políticas de RLS para lectura y escritura transparente de Docentes y Horarios:
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read docentes" ON public.docentes;
CREATE POLICY "Public read docentes" ON public.docentes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all manage docentes" ON public.docentes;
CREATE POLICY "Allow all manage docentes" ON public.docentes FOR ALL USING (true) WITH CHECK (true);

-- Migración para normalizar alumnos al Campus Tijuana en Supabase:
UPDATE public.alumnos 
SET sede_id = 'sede-tij', sede_nombre = 'Campus Tijuana' 
WHERE sede_nombre IS NULL 
   OR sede_nombre = '' 
   OR sede_nombre IN ('Campus Magdalena Contreras', 'Sede Justo Sierra', 'Sede Coyoacán', 'Sede Azcapotzalco');

-- Migración para corregir asignación errónea de tutor (Dr. Adrian Silva es Docente del Campus Tijuana, no tutor):
UPDATE public.alumnos 
SET tutor = 'Tutor UNRC' 
WHERE tutor ILIKE '%Adrian Silva%' OR tutor ILIKE '%Adrián Silva%';

-- 2.6 TEACHERS (Docentes)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    specialty TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 COURSES / SUBJECTS (Asignaturas)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    grade_section_id UUID REFERENCES public.grades_sections(id) ON DELETE CASCADE NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE NOT NULL,
    schedule_description TEXT DEFAULT 'Lunes a Sábado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 ATTENDANCES (Registro Diario de Asistencias)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(course_id, student_id, date)
);

-- 2.9 EVALUATIONS (Evaluaciones / Tareas / Exámenes)
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    weight_percentage NUMERIC(5,2) DEFAULT 20.00 NOT NULL,
    term TEXT DEFAULT 'Parcial 1' NOT NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10 GRADES (Calificaciones por Alumno)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC(4,2) NOT NULL DEFAULT 10.00 CHECK (score >= 0 AND score <= 10),
    teacher_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(evaluation_id, student_id)
);

-- 2.11 INVOICES (Tesorería / Colegiaturas)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    concept TEXT NOT NULL DEFAULT 'Colegiatura Mensual',
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 ANNOUNCEMENTS (Comunicados Institucionales)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_roles user_role[] DEFAULT ARRAY['admin','teacher','student','guardian']::user_role[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. HIGH PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_grade_section ON public.students(grade_section_id);
CREATE INDEX IF NOT EXISTS idx_students_guardian ON public.students(guardian_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendances_course_date ON public.attendances(course_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON public.attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_evaluation ON public.grades(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student_status ON public.invoices(student_id, status);
CREATE INDEX IF NOT EXISTS idx_alumnos_matricula ON public.alumnos(matricula);
CREATE INDEX IF NOT EXISTS idx_alumnos_carrera_grupo ON public.alumnos(carrera_id, grupo);

-- ==========================================
-- 4. AUTOMATIC USER CREATION TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

-- Helper RLS helper functions
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5.1 PROFILES Policies
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE USING (
    auth.uid() = id OR public.get_user_role() = 'admin'
);

-- 5.2 COURSES & SECTIONS Public Read / Admin Manage Policies
DROP POLICY IF EXISTS "Public read academic_years" ON public.academic_years;
CREATE POLICY "Public read academic_years" ON public.academic_years FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read grades_sections" ON public.grades_sections;
CREATE POLICY "Public read grades_sections" ON public.grades_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read courses" ON public.courses;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);

-- 5.3 ATTENDANCES Policies
DROP POLICY IF EXISTS "Admin full control attendances" ON public.attendances;
CREATE POLICY "Admin full control attendances" ON public.attendances FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Teacher manage course attendances" ON public.attendances;
CREATE POLICY "Teacher manage course attendances" ON public.attendances FOR ALL USING (
    course_id IN (
        SELECT c.id FROM public.courses c
        JOIN public.teachers t ON c.teacher_id = t.id
        WHERE t.profile_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Student view own attendances" ON public.attendances;
CREATE POLICY "Student view own attendances" ON public.attendances FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "Guardian view ward attendances" ON public.attendances;
CREATE POLICY "Guardian view ward attendances" ON public.attendances FOR SELECT USING (
    student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.guardians g ON s.guardian_id = g.id
        WHERE g.profile_id = auth.uid()
    )
);

-- 5.4 GRADES Policies
DROP POLICY IF EXISTS "Admin full control grades" ON public.grades;
CREATE POLICY "Admin full control grades" ON public.grades FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Teacher manage course grades" ON public.grades;
CREATE POLICY "Teacher manage course grades" ON public.grades FOR ALL USING (
    evaluation_id IN (
        SELECT e.id FROM public.evaluations e
        JOIN public.courses c ON e.course_id = c.id
        JOIN public.teachers t ON c.teacher_id = t.id
        WHERE t.profile_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Student view own grades" ON public.grades;
CREATE POLICY "Student view own grades" ON public.grades FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "Guardian view ward grades" ON public.grades;
CREATE POLICY "Guardian view ward grades" ON public.grades FOR SELECT USING (
    student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.guardians g ON s.guardian_id = g.id
        WHERE g.profile_id = auth.uid()
    )
);

-- 5.5 INVOICES Policies
DROP POLICY IF EXISTS "Admin full control invoices" ON public.invoices;
CREATE POLICY "Admin full control invoices" ON public.invoices FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Guardian view ward invoices" ON public.invoices;
CREATE POLICY "Guardian view ward invoices" ON public.invoices FOR SELECT USING (
    student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.guardians g ON s.guardian_id = g.id
        WHERE g.profile_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Student view own invoices" ON public.invoices;
CREATE POLICY "Student view own invoices" ON public.invoices FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

-- 5.6 ANNOUNCEMENTS Policies
DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (
    public.get_user_role() = 'admin' OR (public.get_user_role() = ANY(target_roles))
);

-- 5.7 ALUMNOS (Control Escolar y Carga Masiva) Policies
DROP POLICY IF EXISTS "Public read alumnos" ON public.alumnos;
CREATE POLICY "Public read alumnos" ON public.alumnos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage alumnos" ON public.alumnos;
CREATE POLICY "Admin manage alumnos" ON public.alumnos FOR ALL USING (
    public.get_user_role() = 'admin' OR auth.role() = 'authenticated' OR auth.role() = 'anon'
);

-- 5.8 DOCENTES (Personal Académico y Carga Masiva) Policies
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read docentes" ON public.docentes;
CREATE POLICY "Public read docentes" ON public.docentes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage docentes" ON public.docentes;
CREATE POLICY "Admin manage docentes" ON public.docentes FOR ALL USING (
    public.get_user_role() = 'admin' OR auth.role() = 'authenticated' OR auth.role() = 'anon'
);

-- ==========================================
-- 6. INITIAL SEED DATA FOR UNRC / ACADEOVA
-- ==========================================

INSERT INTO public.academic_years (id, name, start_date, end_date, is_active) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Ciclo Escolar 2026-2027', '2026-08-15', '2027-07-01', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.grades_sections (id, grade_level, section_name, academic_year_id) VALUES
    ('e1010000-0000-0000-0000-000000000101', '1° Semestre', '101', 'a1111111-1111-1111-1111-111111111111'),
    ('e1020000-0000-0000-0000-000000000102', '1° Semestre', '102', 'a1111111-1111-1111-1111-111111111111'),
    ('e2010000-0000-0000-0000-000000000201', '2° Semestre', '201-TUR', 'a1111111-1111-1111-1111-111111111111'),
    ('e2030000-0000-0000-0000-000000000203', '2° Semestre', '203-ADM', 'a1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- 6.1 DOCENTES INSTITUCIONALES (Dr. Adrian Silva y Claustro Académico)
INSERT INTO public.docentes (
    id, num_empleado, nombre, apellido_paterno, apellido_materno, email,
    departamento, puesto, materias, carreras_asignadas, sede_id, sede_nombre, telefono
) VALUES
    (
        'docente-3',
        'DOC-UNRC-03',
        'Adrian',
        'Silva',
        '',
        'adrian.silva@rcastellanos.cdmx.gob.mx',
        'Dirección Campus Tijuana / Lic. en Administración / Lic. en Turismo',
        'docente',
        ARRAY['Matemáticas para la Administración', 'Administración y Gestión Estratégica', 'Contabilidad y Finanzas Aplicadas', 'Administración de Empresas de Hospedaje', 'Programación para la ciencia de datos'],
        ARRAY['Lic. en Administración', 'Lic. en Turismo', 'Licenciatura en Ciencia de Datos para los Negocios'],
        'sede-tij',
        'Campus Tijuana',
        '+526641234567'
    ),
    (
        'docente-1',
        'DOC-UNRC-01',
        'Alejandro',
        'Valdez',
        'Mendoza',
        'alejandro.valdez@rcastellanos.cdmx.gob.mx',
        'Lic. en Ciencias de Datos e IA',
        'docente',
        ARRAY['Programación Web y Bases de Datos', 'Inteligencia Artificial y Aprendizaje Automático', 'Minería de Datos y Modelado Predictivo'],
        ARRAY['Lic. en Ciencias de Datos e Inteligencia Artificial', 'Licenciatura en Ciencia de Datos para los Negocios'],
        'sede-tij',
        'Campus Tijuana',
        '+525599887766'
    ),
    (
        'docente-2',
        'DOC-UNRC-02',
        'Beatriz',
        'Sánchez',
        'Pineda',
        'beatriz.sanchez@rcastellanos.cdmx.gob.mx',
        'Lic. en TIC',
        'docente',
        ARRAY['Estructura de Datos y Algoritmos', 'Ingeniería de Software y Sistemas Web'],
        ARRAY['Lic. en Tecnologías de la Información y Comunicación'],
        'sede-tij',
        'Campus Tijuana',
        '+525588776655'
    )
ON CONFLICT (num_empleado) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido_paterno = EXCLUDED.apellido_paterno,
    departamento = EXCLUDED.departamento,
    materias = EXCLUDED.materias,
    carreras_asignadas = EXCLUDED.carreras_asignadas,
    sede_id = EXCLUDED.sede_id,
    sede_nombre = EXCLUDED.sede_nombre;

-- 6.2 PROFILES Y TEACHERS RELACIONALES (Para Horarios y Asignaturas)
INSERT INTO public.profiles (id, full_name, role, email, avatar_url) VALUES
    ('d0000003-0000-0000-0000-000000000003', 'Dr. Adrian Silva', 'teacher', 'adrian.silva@rcastellanos.cdmx.gob.mx', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200'),
    ('d0000001-0000-0000-0000-000000000001', 'Mtro. Alejandro Valdez', 'teacher', 'alejandro.valdez@rcastellanos.cdmx.gob.mx', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200'),
    ('d0000002-0000-0000-0000-000000000002', 'Mtra. Beatriz Sánchez', 'teacher', 'beatriz.sanchez@rcastellanos.cdmx.gob.mx', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email;

INSERT INTO public.teachers (id, profile_id, specialty) VALUES
    ('t0000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', 'Administración y Ciencias de Datos'),
    ('t0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'Inteligencia Artificial y Modelado Predictivo'),
    ('t0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'Estructuras de Datos y Redes')
ON CONFLICT (profile_id) DO NOTHING;

-- 6.3 ASIGNATURAS / COURSES ASIGNADOS AL DOCENTE DR. ADRIAN SILVA
INSERT INTO public.courses (id, name, teacher_id, grade_section_id, academic_year_id, schedule_description) VALUES
    ('c2010000-0000-0000-0000-000000000201', 'Administración de Empresas de Hospedaje', 't0000003-0000-0000-0000-000000000003', 'e2010000-0000-0000-0000-000000000201', 'a1111111-1111-1111-1111-111111111111', 'Miércoles (09:00 - 11:00) y Sábados (07:00 - 09:00) - Docente: Dr. Adrian Silva'),
    ('c2030000-0000-0000-0000-000000000203', 'Matemáticas para la Administración', 't0000003-0000-0000-0000-000000000003', 'e2030000-0000-0000-0000-000000000203', 'a1111111-1111-1111-1111-111111111111', 'Lunes (07:00 - 09:00) y Miércoles (11:00 - 13:00) - Docente: Dr. Adrian Silva')
ON CONFLICT DO NOTHING;

-- 6.4 ASIGNAR DOCENTE DR. ADRIAN SILVA EN EXPEDIENTES DE ALUMNOS IMPORTADOS
UPDATE public.alumnos
SET docente_nombre = 'Dr. Adrian Silva',
    docente_id = 'docente-3'
WHERE (grupo ILIKE '%201-TUR%' OR grupo ILIKE '%203-ADM%' OR grupo ILIKE '%PHLAC%')
  AND (docente_nombre IS NULL OR docente_nombre = '');

-- ==========================================
-- 7. TIMETABLE & SCHEDULE SYSTEM (HORARIOS ESCOLARES)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "btree_gist";

DO $$ BEGIN
    CREATE TYPE day_of_week_enum AS ENUM (
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7.1 SUBJECTS / ASIGNATURAS DETALLADAS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    color_hex VARCHAR(7) DEFAULT '#3B82F6',
    credits INT DEFAULT 8 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7.2 SECTIONS / GRUPOS DETALLADOS (Compatible con grades_sections)
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7.3 BLOQUES DE HORARIO (TIMETABLE ENTRIES)
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    day_of_week day_of_week_enum NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom VARCHAR(50) DEFAULT 'Aula por asignar',
    is_online BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT check_valid_time_interval CHECK (end_time > start_time),

    -- INTEGRIDAD 1: Evitar solapamiento para un mismo docente
    CONSTRAINT no_teacher_schedule_overlap EXCLUDE USING gist (
        teacher_id WITH =,
        day_of_week WITH =,
        tsrange(
            ('2000-01-01 ' || start_time)::timestamp,
            ('2000-01-01 ' || end_time)::timestamp
        ) WITH &&
    ),

    -- INTEGRIDAD 2: Evitar solapamiento para un mismo grupo/sección
    CONSTRAINT no_section_schedule_overlap EXCLUDE USING gist (
        section_id WITH =,
        day_of_week WITH =,
        tsrange(
            ('2000-01-01 ' || start_time)::timestamp,
            ('2000-01-01 ' || end_time)::timestamp
        ) WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_timetable_section_day_time ON public.timetable_entries(section_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_day_time ON public.timetable_entries(teacher_id, day_of_week, start_time);

-- 7.4 RLS POLICIES PARA HORARIOS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read sections" ON public.sections;
CREATE POLICY "Public read sections" ON public.sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read timetable_entries" ON public.timetable_entries;
CREATE POLICY "Public read timetable_entries" ON public.timetable_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage timetable" ON public.timetable_entries;
CREATE POLICY "Admin manage timetable" ON public.timetable_entries FOR ALL USING (
    public.get_user_role() = 'admin'
);

-- ============================================================================
-- 7.5 RLS POLICIES PARA CATÁLOGO DE ASIGNATURAS (materias) Y CARRERAS
-- ============================================================================
ALTER TABLE IF EXISTS public.materias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read materias" ON public.materias;
CREATE POLICY "Public read materias" ON public.materias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all manage materias" ON public.materias;
CREATE POLICY "Allow all manage materias" ON public.materias FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.carreras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read carreras" ON public.carreras;
CREATE POLICY "Public read carreras" ON public.carreras FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all manage carreras" ON public.carreras;
CREATE POLICY "Allow all manage carreras" ON public.carreras FOR ALL USING (true) WITH CHECK (true);


