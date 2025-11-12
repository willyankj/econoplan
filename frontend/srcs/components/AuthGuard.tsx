'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsVerified(true);
    }
  }, [router]);

  // While checking, render nothing or a loading spinner.
  // This prevents the children from rendering prematurely and avoids SSR issues.
  if (!isVerified) {
    return null; // Or <LoadingSpinner />
  }

  // If verified, render the protected content.
  return <>{children}</>;
};

export default AuthGuard;
