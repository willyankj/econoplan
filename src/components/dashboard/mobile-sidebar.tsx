'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from '@/components/ui/sheet';
import { SidebarUI } from './sidebar-ui'; // Importa o visual

// Agora aceita os dados como propriedade
export function MobileSidebar({ user, workspaces, activeWorkspaceId, tenantName, role }: any) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      
      <SheetContent side="left" className="p-0 w-72 border-slate-800 bg-[#0f1218]">
        <SheetHeader className="hidden">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navegação</SheetDescription>
        </SheetHeader>
        
        {/* Renderiza o Visual passando a função para fechar */}
        <SidebarUI 
            user={user}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            tenantName={tenantName}
            role={role}
            onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
