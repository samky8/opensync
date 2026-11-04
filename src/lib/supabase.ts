import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { bearerToken } from './mobile-auth';
import { supabasePublishableKey } from './supabase-config';
export const authConfigured = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    supabasePublishableKey() &&
    process.env.DATABASE_URL
  );
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublishableKey()!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            /* Server Components cannot write cookies; proxy refreshes sessions. */
          }
        },
      },
    },
  );
}
export async function requireUser() {
  if (!authConfigured()) throw new Error('Supabase setup required');
  const authorization = (await headers()).get('authorization');
  const token = bearerToken(authorization);
  const client =
    authorization !== null
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabasePublishableKey()!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
          },
        )
      : await supabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token ?? undefined);
  if (error || !user) throw new Error('Please sign in');
  if (user.email && !user.email_confirmed_at)
    throw new Error('Please sign in after verifying your email');
  return user;
}
