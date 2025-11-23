'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteAccount } from '@/app/dashboard/actions';
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

interface DeleteAccountButtonProps {
  id: string;
  name: string;
}

export function DeleteAccountButton({ id, name }: DeleteAccountButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteAccount(id);
    setIsLoading(false);

    if (result?.error) {
        toast.error("Acesso Negado", { description: result.error });
    } else {
        toast.success("Conta excluída com sucesso.");
        setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Conta Bancária
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Você está prestes a excluir a conta <strong>{name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-sm bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-destructive space-y-2">
          <p className="font-semibold flex items-center gap-2">
            ⚠️ Atenção: Esta ação é irreversível!
          </p>
          <p>
            Ao confirmar, o sistema apagará automaticamente todo o histórico de receitas e despesas desta conta.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted">
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