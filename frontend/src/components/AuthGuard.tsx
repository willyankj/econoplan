'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Render children only if token exists, otherwise, it will redirect.
  // We can show a loading spinner here in the future.
  return <>{localStorage.getItem('token') ? children : null}</>;
};

export default AuthGuard;
