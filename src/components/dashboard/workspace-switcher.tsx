'use client';

import { useState, useTransition } from "react";
import { ChevronsUpDown, Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, switchWorkspace } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface WorkspaceSwitcherProps {
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string;
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition(); 
  const router = useRouter();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    const result = await createWorkspace(formData);
    
    setIsLoading(false);
    
    if (result?.error) {
        toast.error("Erro", { description: result.error });
    } else {
        toast.success("Workspace criado!");
        setOpen(false);
        router.refresh();
    }
  }

  function onSelectWorkspace(id: string) {
    startTransition(async () => {
        await switchWorkspace(id);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between bg-muted/50 border-input hover:bg-accent hover:text-accent-foreground text-foreground"
            disabled={isPending}
          >
            <div className="flex items-center gap-2 truncate">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {activeWorkspace?.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="truncate">{activeWorkspace?.name}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-[200px] bg-popover border-border text-popover-foreground shadow-md">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Meus Workspaces</DropdownMenuLabel>
          
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => onSelectWorkspace(workspace.id)}
              className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
            >
              <Check
                className={`mr-2 h-4 w-4 ${
                  workspace.id === activeWorkspace?.id ? "opacity-100 text-emerald-500" : "opacity-0"
                }`}
              />
              {workspace.name}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem onSelect={() => setOpen(true)} className="focus:bg-accent focus:text-accent-foreground cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Criar novo...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Criar Workspace</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adicione uma nova área de trabalho (ex: Pessoal, Empresa, Filhos).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateWorkspace}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Ex: Financeiro da Loja" 
                className="bg-muted border-input text-foreground" 
                required 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {isLoading ? "Criando..." : "Criar Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}