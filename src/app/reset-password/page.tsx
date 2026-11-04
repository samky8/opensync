import { AuthForm } from '@/components/auth-form';
import { authConfigured, supabase } from '@/lib/supabase';
export default async function Page() {
  const configured = authConfigured();
  const user = configured ? (await (await supabase()).auth.getUser()).data.user : null;
  return <AuthForm mode={user ? 'update' : 'reset'} google={false} />;
}
