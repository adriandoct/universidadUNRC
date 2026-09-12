"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Users, School, DollarSign, FileText, Bell, CheckCircle2, Search, ArrowUpRight } from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'users' | 'announcements'>('overview');

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#0D1E3A] to-[#122A1E] p-8 border border-amber-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Rol 1: ADMIN • Super Admin / Rectoría & Secretaría</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Control General de Gestión Escolar (ERP)
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Monitoreo centralizado de sedes, ciclos escolares, tesorería/colegiaturas, personal docente, matrículas y comunicados globales.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all"
            >
              Cambiar Rol
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>TOTAL ESTUDIANTES</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">44 Matriculados</div>
          <p className="text-[11px] text-emerald-400">✅ 100% Expedientes al día</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>DOCENTES ACTIVOS</span>
            <School className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">3 Docentes</div>
          <p className="text-[11px] text-gray-400">7 Asignaturas impartidas</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>RECAUDACIÓN MENSUAL</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">$132,000 MXN</div>
          <p className="text-[11px] text-emerald-400">92% Colegiaturas Cobradas</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>ASISTENCIA GLOBAL HOY</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">96.5%</div>
          <p className="text-[11px] text-gray-400">Turismo: Mié y Sáb activos</p>
        </div>
      </div>

      {/* Main Administrative Modules */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
        
        {/* Module Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            🏛️ Estructura & Cursos
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'finance' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            💰 Módulo Financiero (Tesorería)
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            👥 Gestión de Personal & Matrícula
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'announcements' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            📢 Comunicados Institucionales
          </button>
        </div>

        {/* Tab 1: Overview Structure */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              🏛️ <strong>Ciclo Escolar Activo:</strong> 2026-2027 • Configuración de Sedes y Oferta Académica.
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Grupo / Sección</th>
                    <th className="p-3.5">Carrera / Licenciatura</th>
                    <th className="p-3.5">Asignatura Clave</th>
                    <th className="p-3.5">Docente Asignado</th>
                    <th className="p-3.5">Horario Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  <tr className="hover:bg-white/5">
                    <td className="p-3.5 font-bold text-amber-400">Grupo 201-TUR</td>
                    <td className="p-3.5 font-medium text-white">Licenciatura en Turismo</td>
                    <td className="p-3.5 text-gray-300">TUR-201 (Administración de Empresas de Hospedaje)</td>
                    <td className="p-3.5 text-emerald-400 font-bold">Dr. Adrian Silva</td>
                    <td className="p-3.5 font-mono text-emerald-300 text-[11px]">Miércoles 09:00-11:00 | Sábado 07:00-09:00</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3.5 font-bold text-amber-400">Grupo 203-ADM</td>
                    <td className="p-3.5 font-medium text-white">Licenciatura en Administración</td>
                    <td className="p-3.5 text-gray-300">ADM-203 (Matemáticas para la Administración)</td>
                    <td className="p-3.5 text-emerald-400 font-bold">Dr. Adrian Silva</td>
                    <td className="p-3.5 font-mono text-blue-300 text-[11px]">Lunes a Sábado (07:00 - 13:00)</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3.5 font-bold text-amber-400">Grupo 101</td>
                    <td className="p-3.5 font-medium text-white">Lic. Ciencias de Datos e IA</td>
                    <td className="p-3.5 text-gray-300">CDIA-101 (Programación Web y Bases de Datos)</td>
                    <td className="p-3.5 text-emerald-400 font-bold">Lic. Alejandro Valdez</td>
                    <td className="p-3.5 font-mono text-blue-300 text-[11px]">Lunes a Sábado (07:00 - 13:00)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Finance Module */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              💳 <strong>Módulo Financiero Escolar:</strong> Emisión de Recibos, Facturación y Control de Pagos de Colegiatura.
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Folio Recibo</th>
                    <th className="p-3.5">Estudiante / Matrícula</th>
                    <th className="p-3.5">Concepto</th>
                    <th className="p-3.5">Monto</th>
                    <th className="p-3.5">Estado de Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  <tr className="hover:bg-white/5">
                    <td className="p-3.5 font-mono text-gray-400">INV-2026-001</td>
                    <td className="p-3.5 font-bold text-white">Dayanna Gissel Buitimea Garma (UNRC-2026-005)</td>
                    <td className="p-3.5 text-gray-300">Colegiatura Septiembre 2026</td>
                    <td className="p-3.5 font-bold text-emerald-400">$3,000.00 MXN</td>
                    <td className="p-3.5"><span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Pagado</span></td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3.5 font-mono text-gray-400">INV-2026-002</td>
                    <td className="p-3.5 font-bold text-white">Astrid Cristina Diaz Moreno (UNRC-2026-006)</td>
                    <td className="p-3.5 text-gray-300">Colegiatura Septiembre 2026</td>
                    <td className="p-3.5 font-bold text-emerald-400">$3,000.00 MXN</td>
                    <td className="p-3.5"><span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Pagado</span></td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3.5 font-mono text-gray-400">INV-2026-003</td>
                    <td className="p-3.5 font-bold text-white">Julibeth Hernandez Herrera (UNRC-2026-007)</td>
                    <td className="p-3.5 text-gray-300">Colegiatura Septiembre 2026</td>
                    <td className="p-3.5 font-bold text-amber-400">$3,000.00 MXN</td>
                    <td className="p-3.5"><span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">Pendiente</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
