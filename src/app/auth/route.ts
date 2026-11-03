import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, authConfigured } from '@/lib/supabase';
import { appUrl, checkOrigin, apiError, rateLimit } from '@/lib/server';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!authConfigured()) throw new Error('Supabase setup required');
    const body = await req.json();
    const op = z.enum(['login', 'signup', 'reset', 'update', 'logout', 'google']).parse(body.op);
    const client = await supabase();
    if (op === 'logout') {
      await client.auth.signOut();
      return Response.json({ ok: true });
    }
    if (op === 'google') {
      if (process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN !== 'true')
        throw new Error('Google sign-in is not configured');
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${appUrl()}/auth/callback` },
      });
      if (error) throw error;
      return Response.json({ url: data.url });
    }
    if (op === 'update') {
      const { error } = await client.auth.updateUser({
        password: z.string().min(12).max(128).parse(body.password),
      });
      if (error) throw error;
      return Response.json({ ok: true });
    }
    const email = z.email().parse(body.email);
    await rateLimit(`auth:${email.toLowerCase()}`, 10);
    if (op === 'reset') {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      return Response.json({
        message: 'If an account exists, a password reset link is on its way.',
      });
    }
    const password = z.string().min(12, 'Use at least 12 characters').max(128).parse(body.password);
    const result =
      op === 'signup'
        ? await client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${appUrl()}/auth/callback` },
          })
        : await client.auth.signInWithPassword({ email, password });
    if (result.error)
      return Response.json(
        {
          error:
            op === 'login'
              ? 'Check your email, password, and email verification.'
              : result.error.message,
        },
        { status: 400 },
      );
    return Response.json({
      ok: true,
      message:
        op === 'signup' && !result.data.session ? 'Check your email to verify your account.' : null,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code && authConfigured()) {
    const { error } = await (await supabase()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appUrl()}/dashboard`);
  }
  return NextResponse.redirect(
    `${appUrl()}/login?error=Please%20request%20a%20new%20sign-in%20link`,
  );
}
