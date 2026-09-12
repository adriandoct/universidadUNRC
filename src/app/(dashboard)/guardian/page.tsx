"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, DollarSign, Bell, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';

export default function GuardianDashboardPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>('child-1');

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#152338] to-[#0D382A] p-8 border border-blue-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Rol 4: GUARDIAN • Portal de Padres y Tutores Legales</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Monitoreo Integral de Hijos Matriculados
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Supervisión en tiempo real de asistencia diaria, avance académico, reportes de disciplina y pasarela de pago de colegiaturas.
            </p>
          </div>

          {/* Multi-Child Selector */}
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Seleccionar Hijo(a):</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="child-1">Dayanna Gissel Buitimea Garma (201-TUR)</option>
              <option value="child-2">Daniel Cruz Mendoza (102-CDIA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Child Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Attendance */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>ASISTENCIA ACUMULADA</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">100%</div>
          <p className="text-xs text-gray-300">Asistencia puntual (Miércoles y Sábados)</p>
        </div>

        {/* Card 2: Academic Progress */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>PROMEDIO GENERAL</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">9.8 / 10</div>
          <p className="text-xs text-emerald-400">Desempeño Sobresaliente</p>
        </div>

        {/* Card 3: Invoices Status */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>ESTADO DE CUENTA</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">Al día</div>
          <p className="text-xs text-gray-300">Colegiatura Septiembre 2026 pagada</p>
        </div>

      </div>

      {/* Account Statement & Payments */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>💳 Estado de Cuenta de Colegiaturas y Recibos</span>
          </h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Folio</th>
                <th className="p-3.5">Estudiante</th>
                <th className="p-3.5">Concepto</th>
                <th className="p-3.5">Fecha Límite</th>
                <th className="p-3.5">Monto</th>
                <th className="p-3.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/20">
              <tr className="hover:bg-white/5">
                <td className="p-3.5 font-mono text-gray-400">REC-2026-09</td>
                <td className="p-3.5 font-bold text-white">Dayanna Gissel Buitimea Garma</td>
                <td className="p-3.5 text-gray-300">Colegiatura Mensual Septiembre 2026</td>
                <td className="p-3.5 text-gray-400">2026-09-10</td>
                <td className="p-3.5 font-bold text-emerald-400">$3,000.00 MXN</td>
                <td className="p-3.5 text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Pagado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
