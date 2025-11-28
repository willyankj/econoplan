import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center space-y-6">
      <div className="p-6 bg-muted/50 rounded-full border border-border">
        <FileQuestion className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight">Página não encontrada</h2>
        <p className="text-muted-foreground max-w-[500px]">
          O endereço que você digitou não existe ou foi movido.
        </p>
      </div>
      <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white px-8">
        <Link href="/dashboard">Voltar ao Início</Link>
      </Button>
    </div>
  );
}
