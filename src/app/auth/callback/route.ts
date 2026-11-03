import { NextResponse } from 'next/server';
import { supabase, authConfigured } from '@/lib/supabase';
import { appUrl } from '@/lib/server';
export async function GET(req: Request) {
  const url = new URL(req.url),
    code = url.searchParams.get('code');
  if (code && authConfigured()) {
    const { error } = await (await supabase()).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        `${appUrl()}${url.searchParams.get('next') === '/reset-password' ? '/reset-password' : '/dashboard'}`,
      );
  }
  return NextResponse.redirect(
    `${appUrl()}/login?error=Verification%20failed.%20Request%20a%20new%20link.`,
  );
}
