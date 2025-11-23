'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Loader2, Pencil } from "lucide-react";
import { updateMemberRole } from '@/app/dashboard/actions';
import { toast } from "sonner";

interface EditRoleModalProps {
  user: {
    id: string;
    name: string | null;
    role: string;
  };
  currentUserRole: string;
}

export function EditRoleModal({ user, currentUserRole }: EditRoleModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // O Dono não pode ser editado, e membros comuns não veem esse modal
  if (user.role === 'OWNER') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-600 border-amber-500/20 cursor-default">
            OWNER
        </span>
      );
  }

  // Se quem está vendo não for Admin/Owner, vê apenas o texto estático
  if (currentUserRole === 'MEMBER' || currentUserRole === 'OBSERVER') {
       return (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border bg-muted text-muted-foreground border-border">
            {user.role}
        </span>
       );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    const result = await updateMemberRole(user.id, formData);
    
    setIsLoading(false);

    if (result?.error) {
        toast.error("Erro", { description: result.error });
    } else {
        toast.success("Cargo atualizado com sucesso!");
        setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={`group flex items-center gap-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border transition-all hover:bg-opacity-80
            ${user.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-muted text-muted-foreground border-border'}
        `}>
            {user.role}
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            Alterar Cargo
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground">
                Editando permissões para: <span className="font-bold text-foreground">{user.name}</span>
            </div>

            <div className="grid gap-2">
                <Label>Novo Cargo</Label>
                <Select name="role" defaultValue={user.role}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    <SelectItem value="ADMIN">ADMIN (Gerente)</SelectItem>
                    <SelectItem value="MEMBER">MEMBER (Padrão)</SelectItem>
                    <SelectItem value="OBSERVER">OBSERVER (Apenas visualiza)</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alteração'}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
