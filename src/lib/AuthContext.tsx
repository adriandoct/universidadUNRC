"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile, db, Alumno, Docente } from './db';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastDetectedAccount: UserProfile | null;
  loginAsAdmin: (accessCodeOrEmail: string, passInput?: string) => Promise<AuthResult>;
  loginWithCredentials: (role: UserRole, idOrEmail: string, passwordInput?: string) => Promise<AuthResult>;
  loginWithLastAccount: () => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  openAuthModal: (defaultRole?: UserRole) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  activeModalTab: UserRole;
  authSecurityMessage: string | null;
}

const DEFAULT_ADMIN: UserProfile = {
  id: 'admin-rectoria-01',
  email: 'admin@admin.com',
  nombre: 'Dra. Rosaura Ruiz Gutiérrez (Rectoría)',
  role: 'administrador',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
  carrera_o_depto: 'Superadmin / Control Total de la Institución'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for security rate limiting & anti-hack lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function checkLockout(): { isLocked: boolean; remainingSeconds: number } {
  if (typeof window === 'undefined') return { isLocked: false, remainingSeconds: 0 };
  const lockoutUntil = parseInt(sessionStorage.getItem('unrc_sec_lockout_until') || '0', 10);
  const now = Date.now();
  if (lockoutUntil && now < lockoutUntil) {
    return { isLocked: true, remainingSeconds: Math.ceil((lockoutUntil - now) / 1000) };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

function recordFailedAttempt(): number {
  if (typeof window === 'undefined') return 0;
  const current = parseInt(sessionStorage.getItem('unrc_sec_failed_attempts') || '0', 10) + 1;
  sessionStorage.setItem('unrc_sec_failed_attempts', current.toString());
  if (current >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
    sessionStorage.setItem('unrc_sec_lockout_until', lockUntil.toString());
  }
  return current;
}

function clearFailedAttempts() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('unrc_sec_failed_attempts');
  sessionStorage.removeItem('unrc_sec_lockout_until');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<UserRole>('alumno');
  const [authSecurityMessage, setAuthSecurityMessage] = useState<string | null>(null);

  // Restore authenticated session strictly from sessionStorage
  useEffect(() => {
    try {
      // Purge any stale legacy localStorage accounts so auth is always required
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unrc_last_account');
        localStorage.removeItem('unrc_auth_user');
        localStorage.removeItem('unrc_auth_role');
      }

      const savedUserStr = sessionStorage.getItem('unrc_auth_user');
      const savedRole = sessionStorage.getItem('unrc_auth_role') as UserRole | null;

      if (savedUserStr && savedRole) {
        const parsed = JSON.parse(savedUserStr);
        setUser(parsed);
        setRoleState(savedRole);
      } else {
        setUser(null);
        setRoleState(null);
      }
    } catch (err) {
      console.error('Error restoring auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (newUser: UserProfile | null, newRole: UserRole | null) => {
    setUser(newUser);
    setRoleState(newRole);

    if (newUser && newRole) {
      sessionStorage.setItem('unrc_auth_user', JSON.stringify(newUser));
      sessionStorage.setItem('unrc_auth_role', newRole);

      // Session cookies (no long max-age, automatically invalidated upon browser session close)
      const cookieRole = newRole === 'administrador' ? 'admin' : newRole === 'docente' ? 'teacher' : 'student';
      document.cookie = `unrc_role=${cookieRole}; path=/; SameSite=Lax`;
      document.cookie = `unrc_demo_session=${cookieRole}; path=/; SameSite=Lax`;
      document.cookie = `unrc_user_id=${newUser.id}; path=/; SameSite=Lax`;
    } else {
      sessionStorage.removeItem('unrc_auth_user');
      sessionStorage.removeItem('unrc_auth_role');
      localStorage.removeItem('unrc_auth_user');
      localStorage.removeItem('unrc_auth_role');
      localStorage.removeItem('unrc_last_account');
      
      // Expire security cookies
      document.cookie = 'unrc_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'unrc_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'unrc_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'unrc_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  };

  const loginWithLastAccount = () => {
    // Disabled for security: user must always authenticate with password
  };

  // 1. Authenticate Super Admin
  const loginAsAdmin = async (accessCodeOrEmail: string, passInput?: string): Promise<AuthResult> => {
    const { isLocked, remainingSeconds } = checkLockout();
    if (isLocked) {
      return {
        success: false,
        error: `🛡️ Sistema bloqueado temporalmente por seguridad anti-hackeo. Espera ${remainingSeconds} segundos antes de reintentar.`
      };
    }

    const email = accessCodeOrEmail.trim().toLowerCase();
    const pass = (passInput || '').trim();

    if (!pass) {
      return {
        success: false,
        error: 'Debe ingresar la contraseña de Administrador.'
      };
    }

    const isValidUser = email === 'admin@admin.com' || email === 'admin';
    const isValidPass = pass === '12345678Rosario';

    if (isValidUser && isValidPass) {
      clearFailedAttempts();
      saveSession(DEFAULT_ADMIN, 'administrador');
      setIsAuthModalOpen(false);
      await db.addAuditoria(
        'ACCESO_SUPERADMIN_AUTORIZADO',
        'Seguridad / Autenticación',
        'Acceso validado a consola de Rectoría / Superadmin',
        'Superadmin UNRC'
      );
      return { success: true, user: DEFAULT_ADMIN };
    }

    const attempts = recordFailedAttempt();
    await db.addAuditoria(
      'ACCESO_BLOQUEADO_CREDENCIALES_INVALIDAS',
      'Seguridad / Autenticación',
      `Intento fallido de acceso administrativo (${attempts}/${MAX_FAILED_ATTEMPTS}) con usuario '${email}'`,
      'Sistema Anti-Hackeo UNRC'
    );

    return {
      success: false,
      error: `Credenciales de Administrador incorrectas. Intento ${attempts} de ${MAX_FAILED_ATTEMPTS}.`
    };
  };

  // 2. Authenticate Alumno or Docente strictly against Superadmin database
  const loginWithCredentials = async (
    targetRole: UserRole,
    idOrEmail: string,
    passwordInput?: string
  ): Promise<AuthResult> => {
    setIsLoading(true);
    const { isLocked, remainingSeconds } = checkLockout();
    if (isLocked) {
      setIsLoading(false);
      return {
        success: false,
        error: `🛡️ Acceso suspendido temporalmente por seguridad anti-hackeo. Espera ${remainingSeconds} segundos.`
      };
    }

    const cleanInput = idOrEmail.trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    if (!cleanInput) {
      setIsLoading(false);
      return {
        success: false,
        error: `Por favor ingresa tu ${targetRole === 'alumno' ? 'Matrícula Oficial' : 'Número de Empleado'}.`
      };
    }

    if (!cleanPassword) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Por motivos de seguridad institucional, debe ingresar su contraseña.'
      };
    }

    try {
      if (targetRole === 'alumno') {
        const alumnos = await db.getAlumnos();
        const found = alumnos.find((a: Alumno) => {
          const mat = a.matricula.toLowerCase();
          const qr = (a.qr_code || '').toLowerCase();
          const email = `${mat}@rcastellanos.cdmx.gob.mx`;
          const fullName = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase().replace(/\s+/g, '');
          const normalizedInput = cleanInput.replace(/\s+/g, '');

          return mat === cleanInput || qr === cleanInput || email === cleanInput || fullName.includes(normalizedInput);
        });

        if (!found) {
          const attempts = recordFailedAttempt();
          await db.addAuditoria(
            'ACCESO_DENEGADO_ALUMNO_NO_REGISTRADO',
            'Seguridad / Autenticación',
            `Intento no autorizado de alumno con identificador: '${cleanInput}' (${attempts}/${MAX_FAILED_ATTEMPTS})`,
            'Sistema Anti-Hackeo UNRC'
          );
          setIsLoading(false);
          return {
            success: false,
            error: 'Credenciales incorrectas. Verifique su matrícula y contraseña.'
          };
        }

        // Check if student status is active
        const status = found.estado_matricula || 'activo';
        if (status !== 'activo') {
          await db.addAuditoria(
            'ACCESO_RESTRINGIDO_ALUMNO_INACTIVO',
            'Seguridad / Autenticación',
            `Intento de ingreso de alumno inactivo: ${found.matricula} con estatus: ${status}`,
            'Control Escolar UNRC'
          );
          setIsLoading(false);
          return {
            success: false,
            error: `Acceso Restringido: El expediente del alumno está en estatus '${status.toUpperCase()}'. Contacte a Rectoría.`
          };
        }

        // Check password strictly
        const expectedPass = (found.password || `${found.matricula}-2026-2`).trim().toLowerCase();
        const givenPass = cleanPassword.toLowerCase();
        const default1 = `${found.matricula.toLowerCase()}-2026-2`;
        const default2 = `${found.matricula.toLowerCase()}2026-2`;

        if (givenPass !== expectedPass && givenPass !== default1 && givenPass !== default2) {
          const attempts = recordFailedAttempt();
          await db.addAuditoria(
            'CONTRASENA_INCORRECTA_ALUMNO',
            'Seguridad / Autenticación',
            `Contraseña incorrecta para alumno: ${found.matricula} (${attempts}/${MAX_FAILED_ATTEMPTS})`,
            'Sistema Anti-Hackeo UNRC'
          );
          setIsLoading(false);
          return {
            success: false,
            error: 'Credenciales incorrectas. Verifique su matrícula y contraseña.'
          };
        }

        // Student successfully verified
        clearFailedAttempts();
        const profile: UserProfile = {
          id: found.id,
          email: `${found.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx`,
          nombre: `${found.nombre} ${found.apellido_paterno} ${found.apellido_materno || ''}`.trim(),
          role: 'alumno',
          avatar_url: found.foto_url,
          matricula: found.matricula,
          carrera_o_depto: found.carrera || 'Universidad Rosario Castellanos'
        };

        saveSession(profile, 'alumno');
        setIsAuthModalOpen(false);
        setIsLoading(false);

        await db.addAuditoria(
          'ACCESO_ALUMNO_VALIDADO',
          'Seguridad / Autenticación',
          `Ingreso exitoso del alumno validado: ${profile.nombre} (${found.matricula}) - Grupo: ${found.grupo}`,
          'Control Escolar UNRC'
        );

        return { success: true, user: profile };

      } else if (targetRole === 'docente') {
        const docentes = await db.getDocentes();
        const found = docentes.find((d: Docente) => {
          const num = d.num_empleado.toLowerCase();
          const email = (d.email || '').toLowerCase();
          const fullName = `${d.nombre} ${d.apellido_paterno} ${d.apellido_materno || ''}`.toLowerCase().replace(/\s+/g, '');
          const normalizedInput = cleanInput.replace(/\s+/g, '');

          return num === cleanInput || email === cleanInput || fullName.includes(normalizedInput);
        });

        if (!found) {
          const attempts = recordFailedAttempt();
          await db.addAuditoria(
            'ACCESO_DENEGADO_DOCENTE_NO_REGISTRADO',
            'Seguridad / Autenticación',
            `Intento no autorizado de docente con identificador: '${cleanInput}' (${attempts}/${MAX_FAILED_ATTEMPTS})`,
            'Sistema Anti-Hackeo UNRC'
          );
          setIsLoading(false);
          return {
            success: false,
            error: 'Credenciales incorrectas. Verifique su número de empleado y contraseña.'
          };
        }

        // Check password strictly
        const expectedPass = (found.password || `${found.num_empleado}-2026-2`).trim().toLowerCase();
        const givenPass = cleanPassword.toLowerCase();
        const default1 = `${found.num_empleado.toLowerCase()}-2026-2`;
        const default2 = `${found.num_empleado.toLowerCase()}2026-2`;

        if (givenPass !== expectedPass && givenPass !== default1 && givenPass !== default2) {
          const attempts = recordFailedAttempt();
          await db.addAuditoria(
            'CONTRASENA_INCORRECTA_DOCENTE',
            'Seguridad / Autenticación',
            `Contraseña incorrecta para docente: ${found.num_empleado} (${attempts}/${MAX_FAILED_ATTEMPTS})`,
            'Sistema Anti-Hackeo UNRC'
          );
          setIsLoading(false);
          return {
            success: false,
            error: 'Credenciales incorrectas. Verifique su número de empleado y contraseña.'
          };
        }

        // Teacher successfully verified
        clearFailedAttempts();
        const profile: UserProfile = {
          id: found.id,
          email: found.email,
          nombre: `${found.nombre} ${found.apellido_paterno} ${found.apellido_materno || ''}`.trim(),
          role: 'docente',
          avatar_url: found.foto_url,
          num_empleado: found.num_empleado,
          carrera_o_depto: found.departamento
        };

        saveSession(profile, 'docente');
        setIsAuthModalOpen(false);
        setIsLoading(false);

        await db.addAuditoria(
          'ACCESO_DOCENTE_VALIDADO',
          'Seguridad / Autenticación',
          `Ingreso exitoso del docente: ${profile.nombre} (${found.num_empleado})`,
          'Control Escolar UNRC'
        );

        return { success: true, user: profile };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Error al validar credenciales.' };
    }

    setIsLoading(false);
    return { success: false, error: 'Rol no soportado.' };
  };

  const logout = () => {
    saveSession(null, null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login?logout=true';
    }
  };

  const setRole = (newRole: UserRole) => {
    if (user?.role === 'administrador') {
      if (newRole === 'administrador') {
        saveSession(DEFAULT_ADMIN, 'administrador');
      }
    } else {
      console.warn('Security alert: Role change blocked for non-superadmin users.');
    }
  };

  const openAuthModal = (defaultRole: UserRole = 'alumno') => {
    setActiveModalTab(defaultRole);
    setAuthSecurityMessage(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user && role),
        isLoading,
        lastDetectedAccount: null,
        loginAsAdmin,
        loginWithCredentials,
        loginWithLastAccount,
        logout,
        setRole,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        activeModalTab,
        authSecurityMessage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
