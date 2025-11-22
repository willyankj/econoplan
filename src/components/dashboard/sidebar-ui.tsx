'use client';

import Link from 'next/link';
import { 
  LayoutDashboard, TrendingUp, Settings, Trophy, Target, CreditCard, 
  LogOut, Building2, Landmark, PieChart 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { SignOutItem } from './sign-out-item';
import { ModeToggle } from '@/components/mode-toggle';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarUIProps {
  user: any;
  workspaces: any[];
  activeWorkspaceId: string;
  tenantName: string;
  role: string;
  onNavigate?: () => void; 
}

export function SidebarUI({ user, workspaces, activeWorkspaceId, tenantName, role, onNavigate }: SidebarUIProps) {
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
    { href: '/dashboard/transactions', icon: TrendingUp, label: 'Extrato' },
    { href: '/dashboard/accounts', icon: Landmark, label: 'Contas Bancárias' },
    { href: '/dashboard/cards', icon: CreditCard, label: 'Meus Cartões' },
    { href: '/dashboard/budgets', icon: PieChart, label: 'Planejamento' },
    { href: '/dashboard/goals', icon: Target, label: 'Objetivos' },
    { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    // ALTERADO: bg-card ou bg-background
    <div className="flex flex-col h-full bg-card text-card-foreground">
      {/* Logo Area */}
      <div className="p-6 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Econoplan
          </h1>
          <span className="text-xs text-emerald-500 font-medium tracking-wide">CLOUD BETA</span>
        </div>
      </div>

      {/* Tenant & Workspace Switcher */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Organização</span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">{role}</span>
        </div>
        <div className="flex items-center gap-2 px-2 text-sm font-medium">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            {tenantName}
        </div>
        <div className="h-px bg-border" />
        <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate} 
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-border bg-muted/30 flex items-center gap-2">
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full hover:bg-muted p-2 rounded-lg transition-colors outline-none">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={user?.image || ''} referrerPolicy="no-referrer" />
                  <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <SignOutItem />
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );
}