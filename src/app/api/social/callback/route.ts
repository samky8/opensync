import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { socialOauth, socialAccounts } from '@/db/schema';
import { assertMeta, exchangeMeta, metaPages, stateHash } from '@/lib/meta';
import { encrypt, validState } from '@/lib/google';
import { appUrl, locationAccess } from '@/lib/server';
import { requireUser } from '@/lib/supabase';
export const maxDuration = 60;
export async function GET(req: Request) {
  const jar = await cookies();
  const saved = jar.get('meta_oauth')?.value;
  jar.set('meta_oauth', '', {
    path: '/api/social',
    maxAge: 0,
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
  });
  try {
    assertMeta();
    const url = new URL(req.url),
      state = url.searchParams.get('state'),
      code = url.searchParams.get('code');
    if (!validState(state, saved) || !state || !code) throw new Error('Invalid Meta authorization');
    const user = await requireUser();
    // Consume once, bound to the same signed-in user and original location.
    const [pending] = await db()
      .delete(socialOauth)
      .where(
        and(
          eq(socialOauth.stateHash, stateHash(state)),
          eq(socialOauth.userId, user.id),
          gt(socialOauth.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!pending) throw new Error('Invalid Meta authorization');
    await locationAccess(pending.locationId, true);
    const token = await exchangeMeta(code);
    const pages = await metaPages(token.access_token);
    if (!pages.length) throw new Error('No eligible Meta Pages');
    await db().transaction(async (tx) => {
      for (const page of pages) {
        const values = {
          locationId: pending.locationId,
          pageId: page.id,
          name: page.name,
          instagramId: page.instagram_business_account?.id || null,
          instagramName: page.instagram_business_account?.username || null,
          instagramType: page.instagram_business_account?.account_type || null,
          encryptedToken: encrypt({ access_token: page.access_token }),
          updatedAt: new Date(),
        };
        await tx
          .insert(socialAccounts)
          .values(values)
          .onConflictDoUpdate({
            target: [socialAccounts.locationId, socialAccounts.pageId],
            set: values,
          });
      }
    });
    return NextResponse.redirect(`${appUrl()}/dashboard?tab=social&location=${pending.locationId}`);
    } catch (error) {
    console.error('[Meta OAuth callback failed]', error);
    return NextResponse.redirect(
      `${appUrl()}/dashboard?tab=social&error=${encodeURIComponent('Meta connection failed. Grant Page and Instagram publishing permissions and select a Page you can create content for. Try connecting again.')}`,
    );
  }
}
