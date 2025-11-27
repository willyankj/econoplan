'use client';

import { useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// 6 horas em milissegundos
const INACTIVITY_LIMIT_MS = 6 * 60 * 60 * 1000; 

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    // Força o logout e redireciona
    signOut({ callbackUrl: "/login" });
  }, []);

  useEffect(() => {
    // Se não estiver logado, não faz nada
    if (!session) return;

    let timeoutId: NodeJS.Timeout;

    // Função que reseta o timer
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_LIMIT_MS);
    };

    // Eventos que consideramos como "atividade"
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click"
    ];

    // Adiciona os ouvintes
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Inicia o timer pela primeira vez
    resetTimer();

    // Limpeza ao desmontar
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, handleLogout]);

  return <>{children}</>;
}
