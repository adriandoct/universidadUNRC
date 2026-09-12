"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { ShieldCheck, User, Lock, ArrowRight, School, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'student' | 'guardian'>('admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback for sandbox/demo testing
        console.warn('Supabase Auth Notice:', error.message);
        router.push(`/${selectedRole}`);
        return;
      }

      const userRole = data.user?.user_metadata?.role || selectedRole;
      router.push(`/${userRole}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión.');
      router.push(`/${selectedRole}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
      
      {/* Background Decorator Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0D1527]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
        
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
              onClick={() => setSelectedRole(r)}
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

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Correo Electrónico Institutional</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@rcastellanos.cdmx.gob.mx"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <span>Acceder como {selectedRole.toUpperCase()}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Note */}
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
          <p className="text-xs font-bold text-blue-300 flex items-center justify-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Acceso Sandbox de Demostración Rápida</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Ingresa cualquier credencial de prueba para explorar los paneles RBAC por rol.
          </p>
        </div>

      </div>
    </div>
  );
}
