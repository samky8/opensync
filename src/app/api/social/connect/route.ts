import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { lt } from 'drizzle-orm';
import { db } from '@/db';
import { socialOauth } from '@/db/schema';
import { assertMeta, stateHash } from '@/lib/meta';
import { metaAuthorizationUrl } from '@/lib/meta-config';
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
    return Response.json({ url: metaAuthorizationUrl(state) });
  } catch (error) {
    return apiError(error);
  }
}
