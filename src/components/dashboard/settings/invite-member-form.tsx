'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { inviteMember } from "@/app/dashboard/actions";

interface InviteMemberFormProps {
  workspaces: { id: string; name: string }[];
}

export function InviteMemberForm({ workspaces }: InviteMemberFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await inviteMember(formData);
    setIsLoading(false);
    const form = event.target as HTMLFormElement;
    form.reset();
  }

  return (
    // CORREÇÃO: bg-muted/40, border-border
    <div className="bg-muted/40 p-4 rounded-lg border border-border shadow-sm">
      <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Convidar Novo Membro
      </h4>
      
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
          
          <div className="grid w-full gap-2">
              <Label className="text-xs text-muted-foreground">E-mail do Google</Label>
              <Input 
                name="email" 
                type="email" 
                placeholder="usuario@gmail.com" 
                // CORREÇÃO: bg-background, text-foreground, border-input
                className="bg-background border-input text-foreground h-9 text-sm placeholder:text-muted-foreground" 
                required 
              />
          </div>

          <div className="w-full md:w-[200px] grid gap-2">
              <Label className="text-xs text-muted-foreground">Acesso ao Workspace</Label>
              <Select name="workspaceId" required>
                  <SelectTrigger className="bg-background border-input text-foreground h-9">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  {/* CORREÇÃO: bg-popover */}
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                      {workspaces.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>

          <div className="w-full md:w-[140px] grid gap-2">
              <Label className="text-xs text-muted-foreground">Permissão</Label>
              <Select name="role" defaultValue="MEMBER">
                  <SelectTrigger className="bg-background border-input text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Membro</SelectItem>
                  </SelectContent>
              </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-500 text-white h-9 w-full md:w-auto">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
          </Button>
      </form>
    </div>
  );
}