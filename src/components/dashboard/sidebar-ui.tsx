'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, TrendingUp, Settings, Target, CreditCard, 
  Building2, Landmark, PieChart, ChevronRight, ChevronLeft, LogOut, Tag 
} from 'lucide-react'; // <--- ADICIONEI "Tag" AQUI
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { ModeToggle } from '@/components/mode-toggle';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

interface SidebarUIProps {
  user: any;
  workspaces: any[];
  activeWorkspaceId: string;
  tenantName: string;
  role: string;
  onNavigate?: () => void; 
}

export function SidebarUI({ user, workspaces, activeWorkspaceId, tenantName, role, onNavigate }: SidebarUIProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
    { href: '/dashboard/transactions', icon: TrendingUp, label: 'Extrato' },
    // --- NOVO ITEM ADICIONADO ---
    { href: '/dashboard/categories', icon: Tag, label: 'Categorias' },
    // ----------------------------
    { href: '/dashboard/accounts', icon: Landmark, label: 'Contas Bancárias' },
    { href: '/dashboard/cards', icon: CreditCard, label: 'Meus Cartões' },
    { href: '/dashboard/budgets', icon: PieChart, label: 'Planejamento' },
    { href: '/dashboard/goals', icon: Target, label: 'Objetivos' },
    { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
  ];

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <aside 
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Botão de Recolher (Apenas Desktop) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleCollapse}
        className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-accent hidden lg:flex"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Logo Area */}
      <div className={cn("flex items-center gap-3 p-6 border-b border-border", isCollapsed && "justify-center px-2")}>
        <div className="w-10 h-10 min-w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden transition-all duration-300 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">Econoplan</h1>
            <span className="text-xs text-emerald-500 font-medium tracking-wide block truncate">CLOUD BETA</span>
          </div>
        )}
      </div>

      {/* Tenant & Workspace Switcher */}
      <div className="p-4 space-y-4">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 animate-in fade-in duration-300">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Organização</span>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">{role}</span>
          </div>
        )}
        
        <Link 
          href="/dashboard/organization"
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer overflow-hidden",
            isCollapsed ? "justify-center" : "justify-between group"
          )}
          onClick={onNavigate}
          title={isCollapsed ? tenantName : undefined}
        >
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <div className="w-8 h-8 min-w-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Building2 className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <span className="text-sm font-medium text-foreground truncate">{tenantName}</span>
                )}
            </div>
            {!isCollapsed && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
        </Link>

        {!isCollapsed ? (
           <>
             <div className="h-px bg-border" />
             <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
           </>
        ) : (
           <div className="flex justify-center">
              <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-xs font-bold text-white cursor-default" title="Workspace Ativo">
                 W
              </div>
           </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate} 
                title={isCollapsed ? item.label : undefined}
                className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive 
                        ? "bg-accent text-accent-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed && "justify-center px-2"
                )}
                >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-emerald-500")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
            );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
          <div className={cn("flex items-center gap-2", isCollapsed && "flex-col justify-center gap-4")}>
            
            {!isCollapsed && <ModeToggle />}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <button className={cn(
                    "flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors outline-none min-w-0",
                    isCollapsed ? "w-auto justify-center" : "flex-1"
                )}>
                    <Avatar className="h-9 w-9 border border-border shrink-0">
                        <AvatarImage src={user?.image || ''} referrerPolicy="no-referrer" />
                        <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 text-left overflow-hidden">
                            <p className="text-sm font-medium truncate" title={user?.name}>{user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate" title={user?.email}>{user?.email}</p>
                        </div>
                    )}
                </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isCollapsed ? "start" : "end"} side={isCollapsed ? "right" : "top"} className="min-w-[200px]">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        className="text-rose-500 focus:text-rose-500 cursor-pointer" 
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
    </aside>
  );
}