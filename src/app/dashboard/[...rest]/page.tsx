import { notFound } from "next/navigation";

export default function DashboardCatchAll() {
  // Força o erro 404 para qualquer rota não encontrada dentro do /dashboard
  // Isso ativa o arquivo src/app/dashboard/not-found.tsx que criamos antes
  notFound();
}
