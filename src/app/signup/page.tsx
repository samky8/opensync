import { AuthForm } from '@/components/auth-form';
export default function Page() {
  return (
    <AuthForm
      mode="signup"
      google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true'}
    />
  );
}
