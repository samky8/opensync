import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { assertGoogle, redirectUri } from '@/lib/google';
import { apiError, checkOrigin, locationAccess, planFor } from '@/lib/server';
import { z } from 'zod';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    assertGoogle();
    const { id } = await req.json();
    const { location } = await locationAccess(z.uuid().parse(id), true);
    if ((await planFor(location.organizationId)) === 'free')
      throw new Error('Google synchronization requires Pro');
    const state = randomBytes(32).toString('hex');
    (await cookies()).set('google_oauth', JSON.stringify({ state, id }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/google',
      maxAge: 600,
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      state,
    }).toString();
    return Response.json({ url: url.toString() });
  } catch (e) {
    return apiError(e);
  }
}
