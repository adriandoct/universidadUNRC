"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { db } from '@/lib/db';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  ArrowRight, 
  School, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  KeyRound,
  ShieldAlert
} from 'lucide-react';

const ROLE_PRESETS = {
  admin: {
    email: 'admin@admin.com',
    password: '12345678Rosario',
    label: 'Super Admin (Rectoría / Control Total)'
  },
  teacher: {
    email: 'adrian.silva@rcastellanos.cdmx.gob.mx',
    password: '12345678Rosario',
    label: 'Docente Titular (Validado por Superadmin)'
  },
  student: {
    email: 'UNRC-2026-005',
    password: '12345678Rosario',
    label: 'Estudiante UNRC (Grupo 201-TUR)'
  },
  guardian: {
    email: 'tutor@rcastellanos.cdmx.gob.mx',
    password: '12345678Rosario',
    label: 'Tutor / Padre de Familia'
  }
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'student' | 'guardian'>('admin');
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('12345678Rosario');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<'user' | 'pass' | null>(null);
  const router = useRouter();

  const handleRoleChange = (role: 'admin' | 'teacher' | 'student' | 'guardian') => {
    setSelectedRole(role);
    setEmail(ROLE_PRESETS[role].email);
    setPassword(ROLE_PRESETS[role].password);
    setErrorMsg('');
  };

  const copyToClipboard = (text: string, field: 'user' | 'pass') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPass = password.trim();

      if (selectedRole === 'admin') {
        const isAdminValid = (cleanEmail === 'admin@admin.com' || cleanEmail === 'admin') && cleanPass === '12345678Rosario';
        if (!isAdminValid) {
          throw new Error('ACCESO DENEGADO: Credenciales de Super Admin inválidas. Acceso restringido exclusivamente a Rectoría.');
        }

        document.cookie = `unrc_demo_session=admin; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `unrc_role=admin; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `unrc_user_id=admin-01; path=/; max-age=86400; SameSite=Lax`;

        if (typeof window !== 'undefined') {
          localStorage.setItem('unrc_auth_role', 'administrador');
          localStorage.setItem('unrc_auth_user', JSON.stringify({
            id: 'admin-01',
            nombre: 'Dra. Rosaura Ruiz Gutiérrez',
            email: 'admin@admin.com',
            role: 'administrador',
            cargo: 'Super Admin / Secretaria de Educación'
          }));
        }

        await db.addAuditoria('ACCESO_SUPERADMIN_AUTORIZADO', 'Seguridad / Login', 'Ingreso exitoso a panel de control Superadmin', 'Rectoría');
        window.location.href = '/admin';
        return;

      } else if (selectedRole === 'teacher') {
        const docentes = await db.getDocentes();
        const found = docentes.find(d => 
          d.email.toLowerCase() === cleanEmail.toLowerCase() ||
          d.num_empleado.toLowerCase() === cleanEmail.toLowerCase()
        );

        if (!found) {
          await db.addAuditoria('ACCESO_BLOQUEADO_DOCENTE_NO_ASIGNADO', 'Seguridad / Login', `Intento de acceso con correo o número no asignado por el Superadmin: '${cleanEmail}'`, 'Sistema Anti-Hackeo');
          throw new Error('ACCESO DENEGADO: El docente no se encuentra validado ni asignado por el Superadmin.');
        }

        document.cookie = `unrc_demo_session=teacher; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `unrc_role=teacher; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `unrc_user_id=${found.id}; path=/; max-age=86400; SameSite=Lax`;

        if (typeof window !== 'undefined') {
          localStorage.setItem('unrc_auth_role', 'docente');
          localStorage.setItem('unrc_auth_user', JSON.stringify({
            id: found.id,
            nombre: `${found.nombre} ${found.apellido_paterno} ${found.apellido_materno || ''}`.trim(),
            email: found.email,
            role: 'docente',
            num_empleado: found.num_empleado,
            carrera_o_depto: found.departamento
          }));
        }

        await db.addAuditoria('ACCESO_DOCENTE_AUTORIZADO', 'Seguridad / Login', `Ingreso de docente validado: ${found.nombre} ${found.apellido_paterno}`, 'Seguridad UNRC');
        window.location.href = '/docente';
        return;

      } else if (selectedRole === 'student') {
        const alumnos = await db.getAlumnos();
        const found = alumnos.find(a => 
          a.matricula.toLowerCase() === cleanEmail.toLowerCase() ||
          a.qr_code.toLowerCase() === cleanEmail.toLowerCase() ||
          `${a.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx` === cleanEmail.toLowerCase()
        );

        if (!found) {
          await db.addAuditoria('ACCESO_BLOQUEADO_ALUMNO_NO_REGISTRADO', 'Seguridad / Login', `Intento de acceso no autorizado con matrícula: '${cleanEmail}'`, 'Sistema Anti-Hackeo');
          throw new Error('ACCESO DENEGADO: La matrícula no se encuentra registrada ni asignada por el Superadmin.');
        }

        if (found.estado_matricula && found.estado_matricula !== 'activo') {
          throw new Error(`ACCESO RESTRINGIDO: Matrícula en estatus '${found.estado_matricula.toUpperCase()}'. Contacta a Rectoría para validar tu situación escolar.`);
        }

        document.cookie = `unrc_demo_session=student; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `unrc_role=student; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `unrc_user_id=${found.id}; path=/; max-age=86400; SameSite=Lax`;

        if (typeof window !== 'undefined') {
          localStorage.setItem('unrc_auth_role', 'alumno');
          localStorage.setItem('unrc_auth_user', JSON.stringify({
            id: found.id,
            nombre: `${found.nombre} ${found.apellido_paterno} ${found.apellido_materno || ''}`.trim(),
            email: `${found.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx`,
            role: 'alumno',
            matricula: found.matricula,
            carrera_o_depto: found.carrera || 'Licenciatura UNRC'
          }));
        }

        await db.addAuditoria('ACCESO_ALUMNO_AUTORIZADO', 'Seguridad / Login', `Ingreso de alumno validado: ${found.nombre} (${found.matricula})`, 'Seguridad UNRC');
        window.location.href = '/alumno';
        return;

      } else {
        window.location.href = '/guardian';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al validar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Background Decorator Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0D1527]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 mx-auto shadow-xl shadow-blue-600/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#090E1A] rounded-[14px] flex items-center justify-center">
              <School className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Acadeova SchoolApp</h1>
          <p className="text-xs text-gray-400">Plataforma ERP Escolar Integral • UNRC</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10 text-[11px] font-bold text-center">
          {(['admin', 'teacher', 'student', 'guardian'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRoleChange(r)}
              className={`py-2 rounded-xl transition-all capitalize ${
                selectedRole === r
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === 'admin' ? 'Admin' : r === 'teacher' ? 'Docente' : r === 'student' ? 'Alumno' : 'Tutor'}
            </button>
          ))}
        </div>

        {/* Credenciales Activas en Pantalla */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-emerald-950/40 border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-blue-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              Credenciales oficiales para {selectedRole.toUpperCase()}:
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Listo para entrar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div 
              onClick={() => copyToClipboard(email, 'user')}
              className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10 hover:border-blue-500/50 cursor-pointer transition-colors group"
            >
              <div className="truncate mr-2">
                <span className="text-[10px] text-gray-400 block">Usuario:</span>
                <span className="font-mono text-[11px] text-white font-medium">{email}</span>
              </div>
              <button type="button" className="text-gray-400 group-hover:text-blue-400 p-1" title="Copiar usuario">
                {copiedField === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div 
              onClick={() => copyToClipboard(password, 'pass')}
              className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10 hover:border-emerald-500/50 cursor-pointer transition-colors group"
            >
              <div className="truncate mr-2">
                <span className="text-[10px] text-gray-400 block">Contraseña:</span>
                <span className="font-mono text-[11px] text-white font-medium">{password}</span>
              </div>
              <button type="button" className="text-gray-400 group-hover:text-emerald-400 p-1" title="Copiar contraseña">
                {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Correo Electrónico Institucional</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@admin.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-300">Contraseña</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPassword ? 'Ocultar' : 'Ver contraseña'}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="12345678Rosario"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validando acceso...
              </span>
            ) : (
              <>
                <span>Acceder como {selectedRole.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Note */}
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
          <p className="text-xs font-bold text-blue-300 flex items-center justify-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Acceso Sandbox Garantizado</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Haz clic en <strong>Acceder como {selectedRole.toUpperCase()}</strong> para ingresar directamente a los módulos administrativos y académicos.
          </p>
        </div>

      </div>
    </div>
  );
}
