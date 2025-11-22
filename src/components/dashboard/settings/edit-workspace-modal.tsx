'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Pencil } from "lucide-react";
import { updateWorkspaceName } from '@/app/dashboard/actions';

interface EditWorkspaceModalProps {
  workspace: {
    id: string;
    name: string;
  };
}

export function EditWorkspaceModal({ workspace }: EditWorkspaceModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    // Chama a Server Action passando o ID do workspace específico
    await updateWorkspaceName(workspace.id, formData);
    
    setIsLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10">
            <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1d24] border-slate-700 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Renomear Workspace
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Workspace</Label>
            <Input 
                id="name" 
                name="name" 
                defaultValue={workspace.name} 
                className="bg-slate-900 border-slate-700 text-white" 
                required 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-2">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
