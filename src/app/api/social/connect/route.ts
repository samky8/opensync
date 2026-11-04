import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { lt } from 'drizzle-orm';
import { db } from '@/db';
import { socialOauth } from '@/db/schema';
import { assertMeta, metaRedirect, metaScopes, metaVersion, stateHash } from '@/lib/meta';
import { apiError, checkOrigin, locationAccess, rateLimit } from '@/lib/server';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    assertMeta();
    const { id } = await req.json();
    const { user } = await locationAccess(z.uuid().parse(id), true);
    await rateLimit(`meta-connect:${user.id}`, 10);
    const state = randomBytes(32).toString('hex');
    await db().delete(socialOauth).where(lt(socialOauth.expiresAt, new Date()));
    await db()
      .insert(socialOauth)
      .values({
        stateHash: stateHash(state),
        locationId: id,
        userId: user.id,
        expiresAt: new Date(Date.now() + 600000),
      });
    (await cookies()).set('meta_oauth', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/social',
      maxAge: 600,
    });
    const url = new URL(`https://www.facebook.com/${metaVersion()}/dialog/oauth`);
    url.search = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      redirect_uri: metaRedirect(),
      response_type: 'code',
      scope: metaScopes.join(','),
      auth_type: 'rerequest',
      state,
    }).toString();
    return Response.json({ url: url.toString() });
  } catch (error) {
    return apiError(error);
  }
}
