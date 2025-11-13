// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard if the user is authenticated
    router.replace('/dashboard');
  }, [router]);

  return (
    <AuthGuard>
      {/* This content will be briefly displayed before the redirect */}
      <div className="flex h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    </AuthGuard>
  );
}
