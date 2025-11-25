'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteWorkspace } from '@/app/dashboard/actions';
import { toast } from "sonner";
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
  workspaceId: string;
  workspaceName: string;
}

export function DeleteWorkspaceDialog({ workspaceId, workspaceName }: DeleteWorkspaceProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
        const result = await deleteWorkspace(workspaceId);
        
        if (result?.error) {
            toast.error("Não foi possível excluir", { description: result.error });
        } else {
            toast.success("Workspace excluído com sucesso!");
            setOpen(false);
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
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            type="button" // Garante que não submeta formulários externos
        >
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
            Você tem certeza que deseja excluir <strong>{workspaceName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-sm bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-destructive space-y-2">
          <p className="font-semibold flex items-center gap-2">
            ⚠️ Atenção: Esta ação é irreversível!
          </p>
          <p>
            Ao confirmar, o sistema apagará <strong>permanentemente</strong> todas as contas bancárias, cartões, transações e metas vinculadas a este workspace.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)} 
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Estou ciente, Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}