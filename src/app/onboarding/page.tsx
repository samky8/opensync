import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/dashboard';
import { detail } from '@/lib/server';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  if (!source) redirect('/dashboard');
  const profile = await detail(source);
  if (profile.plan === 'free' || !['owner', 'admin'].includes(profile.role)) redirect('/dashboard');
  return <Dashboard sourceLocationId={source} now={new Date().toISOString()} />;
}
