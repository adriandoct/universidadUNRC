-- ==========================================
-- Universidad Nacional Rosario Castellanos (UNRC)
-- Supabase Database Schema Setup
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- 1. Create ALUMNOS (Students) Table
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matricula TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    grado TEXT NOT NULL,
    grupo TEXT NOT NULL,
    carrera TEXT DEFAULT 'Licenciatura en Ciencias de Datos e IA',
    tutor TEXT NOT NULL,
    telefono TEXT NOT NULL,
    foto_url TEXT,
    qr_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create DOCENTES (Teachers / Professors) Table
CREATE TABLE IF NOT EXISTS docentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    num_empleado TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    departamento TEXT NOT NULL DEFAULT 'Tecnologías de la Información',
    materias TEXT[] DEFAULT ARRAY['Inteligencia Artificial', 'Bases de Datos'],
    foto_url TEXT,
    telefono TEXT DEFAULT '+525500000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create ASISTENCIAS (Attendance Logs) Table
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIME,
    dispositivo TEXT,
    ubicacion TEXT,
    escaneado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create USUARIOS_ROLES Table for Auth & RBAC
CREATE TABLE IF NOT EXISTS usuarios_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('alumno', 'docente', 'administrador')),
    ref_id UUID, -- References alumnos.id or docentes.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_roles ENABLE ROW LEVEL SECURITY;

-- Anonymous/Public access policies for client operation
CREATE POLICY "Allow public read access to alumnos" ON alumnos FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert access to alumnos" ON alumnos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update access to alumnos" ON alumnos FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete access to alumnos" ON alumnos FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public read access to docentes" ON docentes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert access to docentes" ON docentes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update access to docentes" ON docentes FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow public read access to asistencias" ON asistencias FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert access to asistencias" ON asistencias FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public read access to usuarios_roles" ON usuarios_roles FOR SELECT TO anon USING (true);

-- ==========================================
-- SEED DATA (MOCK DATA FOR UNRC)
-- ==========================================

-- Insert mock alumnos
INSERT INTO alumnos (id, matricula, nombre, apellido_paterno, apellido_materno, grado, grupo, carrera, tutor, telefono, foto_url, qr_code)
VALUES 
    ('d3b07384-d113-4a1d-a0b7-cc59218d6e1d', 'UNRC-2026-001', 'Carlos', 'Martínez', 'López', '1° Semestre', 'Group 101', 'Ciencias de la Computación', 'Sra. Mariana López', '+525512345678', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200', 'UNRC-2026-001'),
    ('2b1db1eb-4753-4bfd-a197-8d7667a42a03', 'UNRC-2026-002', 'Sofía', 'Herrera', 'Díaz', '3° Semestre', 'Group 302', 'Inteligencia Artificial', 'Sr. Roberto Herrera', '+525523456789', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200', 'UNRC-2026-002'),
    ('6c5e64e1-2c06-444f-94d1-fb81005a7698', 'UNRC-2026-003', 'Mateo', 'Ramírez', 'Gómez', '5° Semestre', 'Group 501', 'Ciberseguridad', 'Sra. Patricia Gómez', '+525534567890', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200', 'UNRC-2026-003'),
    ('12f170f3-e5b1-4c6e-82d8-21d743a18a56', 'UNRC-2026-004', 'Valentina', 'Castro', 'Vega', '1° Semestre', 'Group 101', 'Ciencias de la Computación', 'Sr. Fernando Castro', '+525545678901', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200', 'UNRC-2026-004')
ON CONFLICT (matricula) DO NOTHING;

-- Insert mock docentes
INSERT INTO docentes (id, num_empleado, nombre, apellido_paterno, apellido_materno, email, departamento, materias, foto_url)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'DOC-UNRC-01', 'Dr. Alejandro', 'Valdez', 'Mendoza', 'alejandro.valdez@rcastellanos.cdmx.gob.mx', 'Ciencias de la Computación', ARRAY['Bases de Datos Avanzadas', 'Programación Web'], 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200'),
    ('b2222222-2222-2222-2222-222222222222', 'DOC-UNRC-02', 'Dra. Beatriz', 'Sánchez', 'Pineda', 'beatriz.sanchez@rcastellanos.cdmx.gob.mx', 'Inteligencia Artificial', ARRAY['Redes Neuronales', 'Algoritmos Complejos'], 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200')
ON CONFLICT (num_empleado) DO NOTHING;
