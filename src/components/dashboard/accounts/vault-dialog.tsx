'use client';

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VaultManager } from "../vaults/vault-manager";
import { PiggyBank } from "lucide-react";

interface VaultDialogProps {
    accountId: string;
    vaults: any[];
    allAccounts: any[]; // <--- NOVO
}

export function VaultDialog({ accountId, vaults, allAccounts }: VaultDialogProps) {
  const totalInVaults = vaults.reduce((acc, v) => acc + Number(v.balance), 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
           <PiggyBank className="w-4 h-4" />
           {totalInVaults > 0 ? (
             <span className="font-bold">R$ {totalInVaults.toFixed(2)}</span>
           ) : (
             "Cofrinhos"
           )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
         {/* Passamos accountName opcional ou buscamos da lista, e passamos allAccounts */}
         <VaultManager 
            accountId={accountId} 
            accountName={allAccounts.find(a => a.id === accountId)?.name || "Conta"}
            vaults={vaults} 
            allAccounts={allAccounts} 
         />
      </DialogContent>
    </Dialog>
  )
}