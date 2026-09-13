import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uyqkxqlovxkgurnuxnfd.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_F-KMTWS6SQt_hOvo9UGK4A_gbDsM0SQ';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessionRoleCookie = request.cookies.get('unrc_role')?.value || request.cookies.get('unrc_demo_session')?.value;
  const path = request.nextUrl.pathname;

  // Handle logout parameter on login page
  if (path === '/login' && request.nextUrl.searchParams.get('logout') === 'true') {
    supabaseResponse.cookies.delete('unrc_demo_session');
    supabaseResponse.cookies.delete('unrc_role');
    supabaseResponse.cookies.delete('unrc_session_token');
    supabaseResponse.cookies.delete('unrc_user_id');
    return supabaseResponse;
  }

  // Determine current effective role
  let effectiveRole: string | null = null;
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      effectiveRole = profile?.role || 'student';
    } catch {
      effectiveRole = sessionRoleCookie || null;
    }
  } else if (sessionRoleCookie) {
    effectiveRole = sessionRoleCookie;
  }

  // Normalize role names
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'administrador';
  const isTeacher = effectiveRole === 'teacher' || effectiveRole === 'docente';
  const isStudent = effectiveRole === 'student' || effectiveRole === 'alumno';
  const isAuthenticated = isAdmin || isTeacher || isStudent;

  // Protected route checking:
  // 1. Admin Routes: Only Super Admin
  if (path.startsWith('/admin')) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'login_required');
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = isTeacher ? '/docente' : '/alumno';
      url.searchParams.set('error', 'admin_access_denied');
      return NextResponse.redirect(url);
    }
  }

  // 2. Teacher & Scanner Routes: Only Docente or Admin
  if (path.startsWith('/teacher') || path.startsWith('/docente') || path.startsWith('/scanner')) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'login_required');
      return NextResponse.redirect(url);
    }
    if (!isTeacher && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/alumno';
      url.searchParams.set('error', 'teacher_access_denied');
      return NextResponse.redirect(url);
    }
  }

  // 3. Student Routes: Only Student or Admin
  if (path.startsWith('/student') || path.startsWith('/alumno')) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'login_required');
      return NextResponse.redirect(url);
    }
    if (!isStudent && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/docente';
      url.searchParams.set('error', 'student_access_denied');
      return NextResponse.redirect(url);
    }
  }

  // 4. Redirect already authenticated users from /login to their authorized home
  if (isAuthenticated && path === '/login' && request.nextUrl.searchParams.get('logout') !== 'true') {
    const url = request.nextUrl.clone();
    if (isAdmin) url.pathname = '/admin';
    else if (isTeacher) url.pathname = '/docente';
    else url.pathname = '/alumno';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

