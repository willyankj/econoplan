'use client';

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VaultManager } from "../vaults/vault-manager"; // Certifique-se que o arquivo anterior está nesta pasta
import { PiggyBank } from "lucide-react";

interface VaultDialogProps {
    accountId: string;
    vaults: any[];
}

export function VaultDialog({ accountId, vaults }: VaultDialogProps) {
  // Calcula o total guardado em todos os cofrinhos desta conta
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
      {/* O DialogContent abre o Gerenciador que criamos antes */}
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
         <VaultManager accountId={accountId} vaults={vaults} />
      </DialogContent>
    </Dialog>
  )
}
