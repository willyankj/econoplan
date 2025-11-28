import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
      <div className="p-4 bg-muted rounded-full">
        <FileQuestion className="w-10 h-10 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Página não encontrada</h2>
        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
          O recurso que você está procurando não existe ou foi movido.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Voltar ao Início</Link>
      </Button>
    </div>
  );
}
