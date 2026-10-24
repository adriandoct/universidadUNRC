"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import AttendanceParticipationReport from '@/components/AttendanceParticipationReport';
import { db, Docente } from '@/lib/db';
import { ArrowLeft, BookOpen, ShieldAlert } from 'lucide-react';

export default function ReportePage() {
  const { user, role, isLoading } = useAuth();
  const [currentDocente, setCurrentDocente] = useState<Docente | null>(null);

  useEffect(() => {
    async function loadDocente() {
      try {
        const allDocs = await db.getDocentes();
        const found =
          allDocs.find(
            (d) =>
              d.id === user?.id ||
              d.num_empleado === user?.id ||
              d.num_empleado === (user as any)?.num_empleado ||
              (user?.email && d.email && user.email.toLowerCase() === d.email.toLowerCase()) ||
              (user?.nombre && `${d.nombre} ${d.apellido_paterno}`.toLowerCase().includes(user.nombre.toLowerCase()))
          ) ||
          allDocs.find((d) => d.num_empleado === 'DOC-UNRC-03') ||
          allDocs[0];
        setCurrentDocente(found || null);
      } catch (e) {
        console.warn(e);
      }
    }
    if (user) {
      loadDocente();
    }
  }, [user]);

  return (
    <div className="min-h-screen pb-16 pt-4 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="flex items-center justify-between">
          <Link
            href={role === 'administrador' ? '/admin' : '/docente'}
            className="inline-flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Volver al {role === 'administrador' ? 'Panel de Administrador' : 'Panel Docente'}</span>
          </Link>

          <span className="text-[11px] font-mono text-gray-400">
            Control de Asistencia & Participación UNRC
          </span>
        </div>
      </div>

      <AttendanceParticipationReport
        currentDocente={currentDocente}
      />
    </div>
  );
}
