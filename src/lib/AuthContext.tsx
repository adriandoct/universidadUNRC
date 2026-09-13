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
  loginWithGoogle: (role: 'alumno' | 'docente', accountOverride?: Partial<UserProfile>) => Promise<AuthResult>;
  loginAsAdmin: (accessCodeOrEmail: string, passInput?: string) => Promise<AuthResult>;
  loginWithCredentials: (role: UserRole, idOrEmail: string) => Promise<AuthResult>;
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
  const lockoutUntil = parseInt(localStorage.getItem('unrc_sec_lockout_until') || '0', 10);
  const now = Date.now();
  if (lockoutUntil && now < lockoutUntil) {
    return { isLocked: true, remainingSeconds: Math.ceil((lockoutUntil - now) / 1000) };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

function recordFailedAttempt(): number {
  if (typeof window === 'undefined') return 0;
  const current = parseInt(localStorage.getItem('unrc_sec_failed_attempts') || '0', 10) + 1;
  localStorage.setItem('unrc_sec_failed_attempts', current.toString());
  if (current >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem('unrc_sec_lockout_until', lockUntil.toString());
  }
  return current;
}

function clearFailedAttempts() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('unrc_sec_failed_attempts');
  localStorage.removeItem('unrc_sec_lockout_until');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [lastDetectedAccount, setLastDetectedAccount] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<UserRole>('alumno');
  const [authSecurityMessage, setAuthSecurityMessage] = useState<string | null>(null);

  // Restore authenticated session from localStorage and verify validity
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('unrc_auth_user');
      const savedRole = localStorage.getItem('unrc_auth_role') as UserRole | null;
      const lastAcc = localStorage.getItem('unrc_last_account');

      if (lastAcc) {
        try {
          setLastDetectedAccount(JSON.parse(lastAcc));
        } catch {
          console.warn('Could not parse last account');
        }
      }

      if (savedUserStr && savedRole) {
        const parsed = JSON.parse(savedUserStr);
        setUser(parsed);
        setRoleState(savedRole);
      } else {
        // No automatic default login! Enforce strict authentication
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
      localStorage.setItem('unrc_auth_user', JSON.stringify(newUser));
      localStorage.setItem('unrc_auth_role', newRole);
      localStorage.setItem('unrc_last_account', JSON.stringify(newUser));
      setLastDetectedAccount(newUser);

      // Sync security cookies for Next.js Middleware
      const cookieRole = newRole === 'administrador' ? 'admin' : newRole === 'docente' ? 'teacher' : 'student';
      document.cookie = `unrc_role=${cookieRole}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `unrc_demo_session=${cookieRole}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `unrc_user_id=${newUser.id}; path=/; max-age=86400; SameSite=Lax`;
    } else {
      localStorage.removeItem('unrc_auth_user');
      localStorage.removeItem('unrc_auth_role');
      // Expire security cookies
      document.cookie = 'unrc_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'unrc_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'unrc_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'unrc_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  };

  const loginWithLastAccount = () => {
    if (lastDetectedAccount) {
      saveSession(lastDetectedAccount, lastDetectedAccount.role);
      setIsAuthModalOpen(false);
    }
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

    const isValidUser = email === 'admin@admin.com' || email === 'admin';
    const isValidPass = pass === '12345678Rosario' || accessCodeOrEmail.trim() === '12345678Rosario';

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
  const loginWithCredentials = async (targetRole: UserRole, idOrEmail: string): Promise<AuthResult> => {
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
            error: `Acceso Denegado: La matrícula o usuario '${cleanInput}' no está registrado ni validado por el Superadmin.`
          };
        }

        // Check if student status is active
        const status = found.estado_matricula || 'activo';
        if (status !== 'activo') {
          await db.addAuditoria(
            'ACCESO_RESTRINGIDO_ALUMNO_INACTIVO',
            'Seguridad / Autenticación',
            `Intento de ingreso de alumno inactivo: ${found.matricula} (${found.nombre} ${found.apellido_paterno}) con estatus: ${status}`,
            'Control Escolar UNRC'
          );
          setIsLoading(false);
          return {
            success: false,
            error: `Acceso Restringido: El expediente del alumno está en estatus '${status.toUpperCase()}'. Contacte a Rectoría para validar su reingreso.`
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
            error: `Acceso Denegado: El número de empleado o correo '${cleanInput}' no ha sido asignado ni validado por el Superadmin.`
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
          `Ingreso exitoso del docente validado: ${profile.nombre} (${found.num_empleado})`,
          'Recursos Humanos UNRC'
        );

        return { success: true, user: profile };
      }
    } catch (e: any) {
      console.error('Credential auth error:', e);
      setIsLoading(false);
      return { success: false, error: `Error de verificación: ${e.message}` };
    }

    setIsLoading(false);
    return { success: false, error: 'Rol no soportado.' };
  };

  // 3. Strict Google Auth validation against Superadmin database
  const loginWithGoogle = async (
    targetRole: 'alumno' | 'docente',
    accountOverride?: Partial<UserProfile>
  ): Promise<AuthResult> => {
    setIsLoading(true);
    const emailToVerify = (accountOverride?.email || '').trim().toLowerCase();

    if (!emailToVerify) {
      setIsLoading(false);
      return { success: false, error: 'Debe proporcionar una cuenta de correo institucional.' };
    }

    // Verify against DB
    if (targetRole === 'alumno') {
      const alumnos = await db.getAlumnos();
      const found = alumnos.find(a => 
        `${a.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx` === emailToVerify ||
        a.matricula.toLowerCase() === emailToVerify.split('@')[0]
      );

      if (!found) {
        setIsLoading(false);
        await db.addAuditoria(
          'ACCESO_GOOGLE_NO_AUTORIZADO',
          'Seguridad / Autenticación',
          `Intento de acceso por Google no autorizado para alumno: ${emailToVerify}`,
          'Sistema Anti-Hackeo'
        );
        return {
          success: false,
          error: `Acceso Denegado: La cuenta Google institucional '${emailToVerify}' no está vinculada a ningún alumno matriculado por el Superadmin.`
        };
      }

      if (found.estado_matricula !== 'activo') {
        setIsLoading(false);
        return {
          success: false,
          error: `Acceso Restringido: El alumno se encuentra en estado '${found.estado_matricula}'.`
        };
      }

      const profile: UserProfile = {
        id: found.id,
        email: emailToVerify,
        nombre: `${found.nombre} ${found.apellido_paterno}`,
        role: 'alumno',
        avatar_url: found.foto_url,
        matricula: found.matricula,
        carrera_o_depto: found.carrera
      };
      saveSession(profile, 'alumno');
      setIsAuthModalOpen(false);
      setIsLoading(false);
      return { success: true, user: profile };

    } else {
      const docentes = await db.getDocentes();
      const found = docentes.find(d => d.email.toLowerCase() === emailToVerify);

      if (!found) {
        setIsLoading(false);
        await db.addAuditoria(
          'ACCESO_GOOGLE_NO_AUTORIZADO',
          'Seguridad / Autenticación',
          `Intento de acceso por Google no autorizado para docente: ${emailToVerify}`,
          'Sistema Anti-Hackeo'
        );
        return {
          success: false,
          error: `Acceso Denegado: El correo docente '${emailToVerify}' no está registrado por el Superadmin.`
        };
      }

      const profile: UserProfile = {
        id: found.id,
        email: found.email,
        nombre: `${found.nombre} ${found.apellido_paterno}`,
        role: 'docente',
        avatar_url: found.foto_url,
        num_empleado: found.num_empleado,
        carrera_o_depto: found.departamento
      };
      saveSession(profile, 'docente');
      setIsAuthModalOpen(false);
      setIsLoading(false);
      return { success: true, user: profile };
    }
  };

  const logout = () => {
    saveSession(null, null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login?logout=true';
    }
  };

  // Safe setRole restricted only to Superadmin for administrative simulation
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
        lastDetectedAccount,
        loginWithGoogle,
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
