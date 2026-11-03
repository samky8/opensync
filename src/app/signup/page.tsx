import { AuthForm } from '@/components/auth-form';
import { authConfigured } from '@/lib/supabase';
export default function Page() {
  return (
    <AuthForm
      mode="signup"
      configured={authConfigured()}
      google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true'}
    />
  );
}
