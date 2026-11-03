import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/dashboard';
import { authConfigured, supabase } from '@/lib/supabase';
import { dashboardData } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!authConfigured()) redirect('/login');
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  if (user.email && !user.email_confirmed_at)
    redirect('/login?error=Please%20verify%20your%20email%20before%20continuing');
  const data = await dashboardData();
  return (
    <Dashboard
      initialLocations={data.locations}
      email={data.email}
      now={new Date().toISOString()}
    />
  );
}
