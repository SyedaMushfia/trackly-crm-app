import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  
  const isLoggedIn = !!req.auth;

  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login');

  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');

  // Protect dashboard route
  // If user is NOT logged in and tries to access dashboard → redirect to login
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Prevent logged-in users from accessing login page
  // If user is logged in and tries to access login → redirect to dashboard
  if (isOnLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
});

// Apply middleware only to these routes
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};