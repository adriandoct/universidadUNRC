"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { 
  User, 
  Lock, 
  ArrowRight, 
  School, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'student' | 'guardian'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = (role: 'admin' | 'teacher' | 'student' | 'guardian') => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
    setErrorMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPass = password.trim();

      if (!cleanEmail || !cleanPass) {
        throw new Error('Debe ingresar su usuario/correo y contraseña institucional.');
      }

      if (selectedRole === 'admin') {
        const isAdminValid = (cleanEmail === 'admin@admin.com' || cleanEmail === 'admin') && cleanPass === '12345678Rosario';
        if (!isAdminValid) {
          await db.addAuditoria('ACCESO_DENEGADO_ADMIN', 'Seguridad / Login', `Credenciales incorrectas para administrador: '${cleanEmail}'`, 'Sistema Anti-Hackeo');
          throw new Error('Credenciales incorrectas. Verifique su usuario y contraseña.');
        }

        document.cookie = `unrc_demo_session=admin; path=/; SameSite=Lax`;
        document.cookie = `unrc_role=admin; path=/; SameSite=Lax`;
        document.cookie = `unrc_user_id=admin-01; path=/; SameSite=Lax`;

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('unrc_auth_role', 'administrador');
          sessionStorage.setItem('unrc_auth_user', JSON.stringify({
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
          await db.addAuditoria('ACCESO_BLOQUEADO_DOCENTE_NO_ASIGNADO', 'Seguridad / Login', `Intento de acceso con usuario no asignado: '${cleanEmail}'`, 'Sistema Anti-Hackeo');
          throw new Error('Credenciales incorrectas. Verifique su número de empleado o correo y contraseña.');
        }

        const expectedPass = (found.password || `${found.num_empleado}-2026-2`).trim();
        const default1 = `${found.num_empleado}-2026-2`;
        const default2 = `${found.num_empleado}2026-2`;

        if (cleanPass !== expectedPass && cleanPass !== default1 && cleanPass !== default2) {
          await db.addAuditoria('CONTRASENA_INCORRECTA_DOCENTE', 'Seguridad / Login', `Contraseña incorrecta para docente: ${found.num_empleado}`, 'Sistema Anti-Hackeo');
          throw new Error('Credenciales incorrectas. Verifique su número de empleado y contraseña.');
        }

        document.cookie = `unrc_demo_session=teacher; path=/; SameSite=Lax`;
        document.cookie = `unrc_role=teacher; path=/; SameSite=Lax`;
        document.cookie = `unrc_user_id=${found.id}; path=/; SameSite=Lax`;

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('unrc_auth_role', 'docente');
          sessionStorage.setItem('unrc_auth_user', JSON.stringify({
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
          throw new Error('Credenciales incorrectas. Verifique su matrícula y contraseña.');
        }

        if (found.estado_matricula && found.estado_matricula !== 'activo') {
          throw new Error(`ACCESO RESTRINGIDO: Matrícula en estatus '${found.estado_matricula.toUpperCase()}'. Contacte a Rectoría para validar su situación escolar.`);
        }

        const expectedPass = (found.password || `${found.matricula}-2026-2`).trim();
        const default1 = `${found.matricula}-2026-2`;
        const default2 = `${found.matricula}2026-2`;

        if (cleanPass !== expectedPass && cleanPass !== default1 && cleanPass !== default2) {
          await db.addAuditoria('CONTRASENA_INCORRECTA_ALUMNO', 'Seguridad / Login', `Contraseña incorrecta para alumno: ${found.matricula}`, 'Sistema Anti-Hackeo');
          throw new Error('Credenciales incorrectas. Verifique su matrícula y contraseña.');
        }

        document.cookie = `unrc_demo_session=student; path=/; SameSite=Lax`;
        document.cookie = `unrc_role=student; path=/; SameSite=Lax`;
        document.cookie = `unrc_user_id=${found.id}; path=/; SameSite=Lax`;

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('unrc_auth_role', 'alumno');
          sessionStorage.setItem('unrc_auth_user', JSON.stringify({
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
    <div className="min-h-screen bg-[#F3F2F8] text-[#1E293B] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Background Decorator Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Login Card with Institutional Colors from Image 1 */}
      <div className="w-full max-w-md bg-[#0D1527] text-white border border-[#5B142F]/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="w-24 h-16 bg-[#5B142F] rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2 border-[#E8A938] p-1 mb-3">
            <img
              src="/unrc_official_logo.png"
              alt="Universidad Nacional Rosario Castellanos"
              className="h-full w-auto object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Acceso Institucional Seguro</h1>
          <p className="text-xs text-amber-200/90 font-medium">Universidad Nacional Rosario Castellanos — Campus Tijuana</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 rounded-2xl border border-white/10 text-[11px] font-bold text-center">
          {(['admin', 'teacher', 'student'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRoleChange(r)}
              className={`py-2 rounded-xl transition-all capitalize ${
                selectedRole === r
                  ? 'bg-gradient-to-r from-[#5B142F] to-[#7D1D41] text-amber-300 border border-[#E8A938] shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === 'admin' ? 'Administrador' : r === 'teacher' ? 'Docente' : 'Alumno'}
            </button>
          ))}
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
            <label className="text-xs font-bold text-gray-300">
              {selectedRole === 'admin' 
                ? 'Usuario o Correo Administrador'
                : selectedRole === 'teacher'
                ? 'Número de Empleado o Correo Institucional'
                : 'Matrícula Oficial o Correo Institucional'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'admin' ? 'admin@admin.com' : selectedRole === 'teacher' ? 'DOC-UNRC-01' : 'UNRC-2026-001'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-gray-300 text-gray-900 placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#E8A938] transition-colors font-mono font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-300">Contraseña Institucional</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8FAFC] border border-gray-300 text-gray-900 placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#E8A938] transition-colors font-mono font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5B142F] via-[#72193C] to-[#5B142F] hover:from-[#4D0F25] hover:to-[#631433] text-amber-200 hover:text-white border border-[#E8A938]/60 font-extrabold text-sm shadow-xl shadow-[#5B142F]/40 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validando credenciales...
              </span>
            ) : (
              <>
                <span>Ingresar al Sistema Seguro</span>
                <ArrowRight className="w-4 h-4 text-[#FBBF24]" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-[#E8A938]/30 text-center space-y-1">
          <p className="text-xs font-bold text-amber-300 flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Seguridad & Privacidad Institucional</span>
          </p>
          <p className="text-[11px] text-gray-400 leading-tight">
            Autenticación protegida con encriptación SSL. No comparta sus credenciales de acceso con terceros.
          </p>
        </div>

      </div>
    </div>
  );
}
