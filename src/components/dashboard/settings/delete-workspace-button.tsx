'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteWorkspace } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { useRouter } from "next/navigation"; // <--- IMPORTANTE: Adicionado
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteWorkspaceProps {
  id: string;
  name: string;
}

export function DeleteWorkspaceButton({ id, name }: DeleteWorkspaceProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter(); // <--- IMPORTANTE: Inicializa o router

  const handleDelete = async () => {
    setIsLoading(true);
    try {
        const result = await deleteWorkspace(id);
        
        if (result?.error) {
            toast.error("Erro ao excluir", { description: result.error });
        } else {
            toast.success("Workspace removido com sucesso.");
            setOpen(false);
            router.refresh(); // <--- IMPORTANTE: Atualiza a tela visualmente
        }
    } catch (error) {
        toast.error("Erro inesperado ao tentar excluir.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10">
            <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Workspace
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Você está prestes a excluir o workspace <strong>{name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-sm bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-destructive space-y-2">
          <p className="font-semibold">⚠️ Ação Irreversível</p>
          <p>
            Todos os dados vinculados a este workspace (transações, contas, cartões e orçamentos) serão permanentemente apagados para todos os membros.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading} className="text-muted-foreground hover:text-foreground">
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}