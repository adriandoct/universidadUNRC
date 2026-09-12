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
