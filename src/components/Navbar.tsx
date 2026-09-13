"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';

export const Navbar: React.FC = () => {
  const { user, role, logout, setRole, openAuthModal } = useAuth();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const roleBadges = {
    alumno: { label: 'Alumno', icon: '🎓', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    docente: { label: 'Docente', icon: '👨‍🏫', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    administrador: { label: 'Admin Base de Datos', icon: '⚡', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#5B142F]/40 bg-[#070912]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left: Official UNRC Emblem & Role Badge */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/unrc_official_logo.png" 
              alt="Universidad Nacional Rosario Castellanos" 
              className="h-12 w-auto object-contain rounded-xl shadow-md border border-[#5B142F]/40 group-hover:scale-105 transition-transform"
            />
          </Link>

          {role && (
            <span className={`hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleBadges[role].color}`}>
              <span>{roleBadges[role].icon}</span>
              <span>{roleBadges[role].label}</span>
            </span>
          )}
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center space-x-2 text-sm font-medium text-gray-300">
          <Link 
            href="/" 
            className={`py-2 px-4 rounded-xl transition-colors ${pathname === '/' ? 'text-amber-300 bg-[#5B142F]/30 font-bold border border-[#5B142F]/50' : 'hover:text-white hover:bg-white/5'}`}
          >
            🏛️ Inicio
          </Link>

          {role === 'alumno' && (
            <Link 
              href="/alumno" 
              className={`py-2 px-4 rounded-xl transition-colors ${pathname === '/alumno' ? 'text-emerald-400 bg-emerald-500/10 font-bold border border-emerald-500/30' : 'hover:text-white hover:bg-white/5'}`}
            >
              🎓 Credencial & Asistencias
            </Link>
          )}

          {role === 'docente' && (
            <>
              <Link 
                href="/docente" 
                className={`py-2 px-4 rounded-xl transition-colors ${pathname === '/docente' ? 'text-blue-400 bg-blue-500/10 font-bold border border-blue-500/30' : 'hover:text-white hover:bg-white/5'}`}
              >
                👨‍🏫 Panel Docente
              </Link>
              <Link 
                href="/scanner" 
                className={`py-2 px-4 rounded-xl transition-colors ${pathname === '/scanner' ? 'text-blue-400 bg-blue-500/10 font-bold border border-blue-500/30' : 'hover:text-white hover:bg-white/5'}`}
              >
                🎥 Escáner QR
              </Link>
            </>
          )}

          {role === 'administrador' && (
            <Link 
              href="/admin" 
              className={`py-2 px-4 rounded-xl transition-colors ${pathname === '/admin' ? 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/30' : 'hover:text-amber-400 hover:bg-white/5'}`}
            >
              ⚡ Consola Base de Datos
            </Link>
          )}
        </nav>

        {/* Right User Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-1.5 pl-3 rounded-full bg-white/5 border border-white/10 hover:border-amber-400/40 transition-all text-left"
              >
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">{user.nombre}</div>
                  <div className="text-[10px] text-amber-300 truncate max-w-[140px]">{user.email}</div>
                </div>

                {user.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.avatar_url}
                    alt={user.nombre}
                    className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shadow"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#5B142F] border border-amber-400 flex items-center justify-center font-bold text-xs text-white">
                    {user.nombre.charAt(0)}
                  </div>
                )}
                <span className="text-gray-400 text-xs pr-1">▼</span>
              </button>

              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0B0F19] border border-amber-500/30 shadow-2xl p-2 z-50 text-xs space-y-1 animate-fadeIn"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="p-3 border-b border-white/10 bg-[#5B142F]/30 rounded-xl">
                    <div className="font-bold text-white text-sm">{user.nombre}</div>
                    <div className="text-amber-300 text-xs truncate">{user.email}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                      Rol Activo: <span className="text-white">{role}</span>
                    </div>
                  </div>

                  <div className="p-2.5 my-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>Validado por Superadmin</span>
                    </div>
                    {user.matricula && (
                      <div className="text-gray-300 font-mono text-[10px]">
                        Matrícula: <strong className="text-white">{user.matricula}</strong>
                      </div>
                    )}
                    {user.num_empleado && (
                      <div className="text-gray-300 font-mono text-[10px]">
                        Num. Empleado: <strong className="text-white">{user.num_empleado}</strong>
                      </div>
                    )}
                    {user.carrera_o_depto && (
                      <div className="text-gray-400 text-[10px] truncate">
                        {user.carrera_o_depto}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-1">
                    {role === 'alumno' && (
                      <Link
                        href="/alumno"
                        className="w-full p-2.5 rounded-xl text-left text-emerald-400 hover:bg-emerald-500/10 flex items-center space-x-2 transition-colors font-medium text-xs block mb-1"
                      >
                        <span>🎓 Mi Portal de Alumno</span>
                      </Link>
                    )}
                    {role === 'docente' && (
                      <Link
                        href="/docente"
                        className="w-full p-2.5 rounded-xl text-left text-blue-400 hover:bg-blue-500/10 flex items-center space-x-2 transition-colors font-medium text-xs block mb-1"
                      >
                        <span>👨‍🏫 Mi Consola Docente</span>
                      </Link>
                    )}
                    {role === 'administrador' && (
                      <Link
                        href="/admin"
                        className="w-full p-2.5 rounded-xl text-left text-amber-400 hover:bg-amber-500/10 flex items-center space-x-2 transition-colors font-medium text-xs block mb-1"
                      >
                        <span>⚡ Consola Superadmin</span>
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="w-full p-2.5 rounded-xl text-left text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors font-semibold"
                    >
                      <span>🚪 Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('alumno')}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#5B142F] to-[#801B42] hover:from-[#70173A] hover:to-[#9B2150] text-amber-200 font-bold text-xs transition-all shadow-lg shadow-[#5B142F]/40 border border-amber-400/30 flex items-center space-x-2"
            >
              <span>🔑 Iniciar Sesión UNRC</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
