'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Label } from "@/components/ui/label";
import { toggleWorkspaceAccess } from '@/app/dashboard/actions';
import { toast } from "sonner"; // <--- ADICIONADO

interface Workspace {
  id: string;
  name: string;
}

interface Props {
  user: { id: string; name: string | null; email: string };
  allWorkspaces: Workspace[];
  userWorkspaces: string[]; 
}

export function ManageAccessModal({ user, allWorkspaces, userWorkspaces }: Props) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (workspaceId: string, checked: boolean) => {
    setLoadingId(workspaceId);
    const result = await toggleWorkspaceAccess(user.id, workspaceId, checked);
    setLoadingId(null);

    // --- LÓGICA DE FEEDBACK ADICIONADA ---
    if (result?.error) {
        toast.error("Erro ao alterar acesso", { description: result.error });
    } else {
        // Mensagem diferente se adicionou ou removeu
        toast.success(checked ? "Acesso concedido!" : "Acesso removido!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">
            <Briefcase className="w-3 h-3 mr-2" />
            Acessos
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1d24] border-slate-700 text-slate-200 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-white">Gerenciar Acessos</DialogTitle>
          <p className="text-xs text-slate-400">
            Defina quais workspaces <strong>{user.name || user.email}</strong> pode acessar.
          </p>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
           {allWorkspaces.map(ws => {
             const hasAccess = userWorkspaces.includes(ws.id);
             const isProcessing = loadingId === ws.id;

             return (
               <div key={ws.id} className="flex items-center space-x-3 p-3 rounded border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
                 {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                 ) : (
                    <Checkbox 
                        id={ws.id} 
                        checked={hasAccess}
                        onCheckedChange={(checked) => handleToggle(ws.id, checked as boolean)}
                        className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                 )}
                 <Label htmlFor={ws.id} className="text-sm font-medium text-slate-200 cursor-pointer flex-1">
                    {ws.name}
                 </Label>
               </div>
             )
           })}
        </div>
      </DialogContent>
    </Dialog>
  );
}