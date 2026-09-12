"use client";

import React, { useState } from 'react';
import AttendanceSheet, { StudentItem } from '../../../components/AttendanceSheet';
import { BookOpen, Calendar, CheckSquare, Sparkles, Award } from 'lucide-react';

export default function TeacherDashboardPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('c-tur-201');

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

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#08152B] to-[#0A382B] p-8 border border-blue-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Rol 2: TEACHER • Consola Docente Dr. Adrian Silva</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Gestión de Cursos y Tomador de Asistencia
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Selecciona tu curso asignado para tomar asistencia en lote, registrar participaciones (AP/RP) y ponderar evaluaciones.
            </p>
          </div>

          {/* Course Selector Dropdown */}
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Seleccionar Curso Asignado:</label>
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
      </div>

      {/* Attendance Sheet Component */}
      <AttendanceSheet
        courseId={selectedCourseId}
        courseName={activeCourseName}
        scheduleDescription={activeSchedule}
        students={activeStudents}
      />

    </div>
  );
}
