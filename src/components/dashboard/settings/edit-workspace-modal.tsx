'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Pencil } from "lucide-react";
import { updateWorkspaceName } from '@/app/dashboard/actions';
import { toast } from "sonner";

export function EditWorkspaceModal({ workspace }: { workspace: { id: string, name: string } }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    try {
        await updateWorkspaceName(workspace.id, formData);
        toast.success("Nome atualizado!");
        setOpen(false);
    } catch {
        toast.error("Erro ao atualizar.");
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[400px] p-0 gap-0 rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
            
            <div className="bg-slate-50 dark:bg-slate-950/20 p-6 pb-8 flex flex-col items-center">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider">
                        Editar Workspace
                    </DialogTitle>
                </DialogHeader>
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-inner">
                    <Briefcase className="w-8 h-8" />
                </div>
            </div>

            <div className="p-6 space-y-5">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground ml-1">Nome do Workspace</Label>
                    <Input 
                        name="name" 
                        defaultValue={workspace.name} 
                        className="bg-muted/50 border-transparent focus:border-slate-500 transition-all h-11" 
                        required 
                    />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-11 shadow-md">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}