import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/dashboard';
import { accountEntitlementsFor, accountOwnsWorkspace } from '@/lib/server';
import { requireUser } from '@/lib/supabase';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; source?: string }>;
}) {
  const { workspace, source } = await searchParams;
  if (workspace !== 'new' && !source) redirect('/dashboard');
  const user = await requireUser().catch(() => redirect('/login'));
  const [billing, ownsWorkspace] = await Promise.all([
    accountEntitlementsFor(user.id),
    accountOwnsWorkspace(user.id),
  ]);
  if (ownsWorkspace && billing.plan !== 'business') redirect('/dashboard?tab=billing');
  return (
    <Dashboard
      newWorkspace
      initialBilling={billing}
      initiallyOwnsWorkspace={ownsWorkspace}
      email={user.email}
      now={new Date().toISOString()}
    />
  );
}
