"use client";

import Link from "next/link";
import { useAuth } from "../lib/AuthContext";

export default function Home() {
  const { openAuthModal } = useAuth();

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-8 space-y-16">
      
      {/* Centered Hero Section */}
      <div className="text-center max-w-4xl mx-auto space-y-8">
        
        {/* Official Institution Pill */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#5B142F]/40 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-widest uppercase shadow-lg shadow-[#5B142F]/20">
          <span>🏛️ Universidad Nacional Rosario Castellanos</span>
        </div>

        {/* PROMINENT CENTERED OFFICIAL LOGO DISPLAY */}
        <div className="flex justify-center items-center py-2">
          <div className="relative group max-w-xl w-full mx-auto p-4 rounded-3xl bg-gradient-to-b from-[#5B142F]/60 via-[#3B0C1E]/40 to-transparent border-2 border-[#801B42]/60 shadow-[0_0_60px_rgba(91,20,47,0.5)] transition-transform duration-300 hover:scale-[1.02]">
            
            {/* Ambient Backlight Glow */}
            <div className="absolute inset-0 bg-[#801B42]/20 rounded-3xl blur-2xl pointer-events-none"></div>

            {/* Official Logo Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/unrc_official_logo.png"
              alt="Universidad Nacional Rosario Castellanos Logo Oficial"
              className="w-full max-h-48 sm:max-h-56 object-contain mx-auto rounded-2xl drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
            Sistema de Control Escolar <br className="hidden sm:inline" />
            y Base de Datos <span className="bg-gradient-to-r from-amber-300 via-emerald-400 to-amber-200 bg-clip-text text-transparent">PostgreSQL UNRC</span>
          </h1>
          
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Plataforma institucional para **Alumnos, Docentes y Administrador**. Autenticación con **Gmail** (`@rcellanos.cdmx.gob.mx`) y consola para carga de datos en **Base de Datos Institucional**.
          </p>
        </div>

        {/* Action Buttons for 3 Roles */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          
          <button
            onClick={() => openAuthModal('alumno')}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>🎓 Acceso Alumnos (Gmail)</span>
            <span>→</span>
          </button>

          <button
            onClick={() => openAuthModal('docente')}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>👨‍🏫 Acceso Docentes (Gmail)</span>
          </button>

          <button
            onClick={() => openAuthModal('administrador')}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>⚡ Administrador Base de Datos</span>
          </button>

        </div>

      </div>

      {/* Grid of the 3 Key Roles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        
        {/* Role Card 1: Alumno */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl text-emerald-400 shadow-lg shadow-emerald-500/10">
              🎓
            </div>
            <h3 className="text-xl font-bold text-white">Rol Alumno</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Credencial digital con código QR institucional dinámico, consulta de historial de asistencias y registro de materias. Autenticación fluida con Gmail <code className="text-emerald-400 font-bold">@rcellanos.cdmx.gob.mx</code>.
            </p>
          </div>

          <Link
            href="/alumno"
            className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs text-center border border-emerald-500/30 transition-all"
          >
            Ver Portal Alumno →
          </Link>
        </div>

        {/* Role Card 2: Docente */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-3xl text-blue-400 shadow-lg shadow-blue-500/10">
              👨‍🏫
            </div>
            <h3 className="text-xl font-bold text-white">Rol Docente</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Escáner QR con cámara web/móvil para pase de lista rápido en el aula, reportes de asistencia por grupo y notificaciones automáticas por WhatsApp a los tutores.
            </p>
          </div>

          <Link
            href="/docente"
            className="w-full py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs text-center border border-blue-500/30 transition-all"
          >
            Ver Portal Docente →
          </Link>
        </div>

        {/* Role Card 3: Administrador */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl text-amber-400 shadow-lg shadow-amber-500/10">
              ⚡
            </div>
            <h3 className="text-xl font-bold text-white">Rol Administrador</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Consola especializada de **gestión y carga de Base de Datos PostgreSQL**. Sube archivos de Excel (`.xlsx`), CSV y JSON para realizar migraciones y sincronizaciones de tablas en tiempo real.
            </p>
          </div>

          <Link
            href="/admin"
            className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs text-center border border-amber-500/30 transition-all"
          >
            Ver Consola Base de Datos →
          </Link>
        </div>

      </div>

    </div>
  );
}
