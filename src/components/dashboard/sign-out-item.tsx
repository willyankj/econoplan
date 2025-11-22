'use client';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function SignOutItem() {
  return (
    <DropdownMenuItem 
      className="focus:bg-slate-800 focus:text-white cursor-pointer text-rose-500 focus:text-rose-500" 
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sair
    </DropdownMenuItem>
  );
}
