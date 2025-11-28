'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Opcional: Logar o erro em serviço de monitoramento (Sentry, etc)
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
      <div className="p-4 bg-rose-500/10 rounded-full">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Algo deu errado!</h2>
        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
          Tivemos um problema ao carregar esta página. Tente novamente.
        </p>
      </div>
      <Button onClick={() => reset()} variant="outline">
        Tentar Novamente
      </Button>
    </div>
  );
}
