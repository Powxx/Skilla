import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // Correction ici

export function middleware(request: NextRequest) {
  console.log("!!! MIDDLEWARE EN VIE SUR :", request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*', 
};