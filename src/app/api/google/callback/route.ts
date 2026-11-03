import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { assertGoogle, validState, tokenExchange, redirectUri, encrypt } from '@/lib/google';
import { locationAccess, appUrl } from '@/lib/server';
import { db } from '@/db';
import { connections } from '@/db/schema';
export async function GET(req: Request) {
  const jar = await cookies();
  try {
    assertGoogle();
    const saved = jar.get('google_oauth')?.value;
    jar.delete('google_oauth');
    const state = saved ? JSON.parse(saved) : null;
    const url = new URL(req.url);
    if (!validState(url.searchParams.get('state'), state?.state) || !url.searchParams.get('code'))
      throw new Error('Invalid OAuth state');
    await locationAccess(state.id, true);
    const token = await tokenExchange({
      grant_type: 'authorization_code',
      code: url.searchParams.get('code')!,
      redirect_uri: redirectUri(),
    });
    if (!token.refresh_token) throw new Error('Refresh authorization required');
    await db()
      .insert(connections)
      .values({
        locationId: state.id,
        encryptedTokens: encrypt({ ...token, expires_at: Date.now() + token.expires_in * 1000 }),
      })
      .onConflictDoUpdate({
        target: connections.locationId,
        set: {
          encryptedTokens: encrypt({ ...token, expires_at: Date.now() + token.expires_in * 1000 }),
          status: 'select_location',
          remoteId: null,
          updatedAt: new Date(),
        },
      });
    return NextResponse.redirect(`${appUrl()}/dashboard?tab=integrations`);
  } catch {
    return NextResponse.redirect(
      `${appUrl()}/dashboard?tab=integrations&error=Google%20authorization%20failed.%20Please%20try%20connecting%20again.`,
    );
  }
}
