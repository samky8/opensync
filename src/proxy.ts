import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublishableKey } from './lib/supabase-config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const key = supabasePublishableKey();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key)
    return response;
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await client.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/api/manage/:path*', '/auth/:path*'],
};
