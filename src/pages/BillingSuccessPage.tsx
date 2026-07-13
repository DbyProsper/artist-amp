import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

export default function BillingSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    getAuth().currentUser?.getIdToken(true).then(() => {
      setTimeout(() => navigate('/studio'), 2000);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-2xl">🎉</span>
        </div>
        <h1 className="text-3xl font-bold">You're upgraded!</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your subscription has been updated. We are refreshing your account and will take you back to the studio shortly.
        </p>
      </div>
    </div>
  );
}
