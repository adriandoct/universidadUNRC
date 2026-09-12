"use client";

import React from 'react';
import Link from 'next/link';
import { User, Calendar, Award, CheckCircle2, Bell, FileText } from 'lucide-react';

export default function StudentDashboardPage() {
  return (
    <div className="space-y-8 animate-fadeIn text-white">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#091C36] to-[#122A1E] p-8 border border-emerald-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <User className="w-3.5 h-3.5" />
              <span>Rol 3: STUDENT • Portal del Estudiante</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ¡Hola, Dayanna Gissel!
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Licenciatura en Turismo • Grupo 201-TUR • Matrícula: <strong className="text-emerald-400 font-mono">UNRC-2026-005</strong>
            </p>
          </div>

          <div className="bg-black/40 px-4 py-3 rounded-2xl border border-white/10 text-right">
            <div className="text-[10px] text-gray-400 font-bold uppercase">PROMEDIO GENERAL</div>
            <div className="text-2xl font-extrabold text-emerald-400">9.8 / 10</div>
          </div>
        </div>
      </div>

      {/* Grid: Schedule & Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Schedule */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>🗓️ Horario de Clases Semanal (Turismo)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">MIÉRCOLES</span>
                <span className="text-[11px] font-mono text-gray-400">09:00 - 11:00 hrs</span>
              </div>
              <div className="font-bold text-white text-sm">Administración de Empresas de Hospedaje</div>
              <p className="text-xs text-gray-400">Docente: Dr. Adrian Silva • Aula 102</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">SÁBADO</span>
                <span className="text-[11px] font-mono text-gray-400">07:00 - 09:00 hrs</span>
              </div>
              <div className="font-bold text-white text-sm">Administración de Empresas de Hospedaje</div>
              <p className="text-xs text-gray-400">Docente: Dr. Adrian Silva • Aula 102</p>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>Asistencia Acumulada</span>
          </h3>

          <div className="text-center py-4 space-y-1">
            <div className="text-4xl font-extrabold text-emerald-400">100%</div>
            <p className="text-xs text-gray-400">4 de 4 sesiones asistidas (Mié y Sáb)</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
            ✅ Sin retardos ni faltas registradas en el periodo.
          </div>
        </div>

      </div>

    </div>
  );
}
