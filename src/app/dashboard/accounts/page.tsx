import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard, Landmark } from "lucide-react";
import { AccountModal } from "@/components/dashboard/accounts/account-modal"; 
import { DeleteAccountButton } from "@/components/dashboard/accounts/delete-account-button"; 
import { VaultDialog } from "@/components/dashboard/accounts/vault-dialog"; // <--- IMPORTAMOS O NOVO BOTÃO
import { BankLogo } from "@/components/ui/bank-logo";
import { getUserWorkspace } from "@/lib/get-user-workspace";

export default async function AccountsPage() {
  const { workspaceId } = await getUserWorkspace();
  
  if (!workspaceId) return <div>Selecione um workspace</div>;

  // MUDANÇA 1: Adicionamos 'include: { vaults: true }' para buscar os cofrinhos
  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId },
    orderBy: { balance: 'desc' },
    include: { vaults: true } 
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Minhas Contas</h2>
          <p className="text-muted-foreground">Gerencie suas fontes de dinheiro</p>
        </div>
        <AccountModal />
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-emerald-500/30 rounded-2xl bg-emerald-500/5 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Landmark className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Comece por aqui</h3>
            <p className="text-muted-foreground max-w-md mb-8">
                Para controlar suas finanças, o primeiro passo é adicionar onde seu dinheiro está guardado (Carteira, Banco, etc).
            </p>
            <div className="transform scale-110">
                <AccountModal />
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
            <Card key={account.id} className="relative overflow-hidden bg-card border-border shadow-sm hover:border-primary/50 transition-all group flex flex-col justify-between">
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                
                <div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-3">
                            <BankLogo bankName={account.bank} className="w-8 h-8" />
                            <span className="capitalize text-foreground">{account.bank}</span>
                        </CardTitle>
                        
                        {account.name.toLowerCase().includes('carteira') ? 
                            <Wallet className="w-5 h-5 text-muted-foreground" /> : 
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                        }
                    </CardHeader>
                    
                    <CardContent className="relative z-10 pb-2">
                        <div className="mt-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo Disponível</p>
                            <h3 className={`text-2xl font-bold ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                            {formatCurrency(Number(account.balance))}
                            </h3>
                        </div>
                    </CardContent>
                </div>

                <CardContent className="relative z-10 pt-0 pb-4">
                    <div className="mt-4 flex justify-between items-center pt-4 border-t border-border/50">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium">{account.name}</p>
                            {/* MUDANÇA 2: Mostramos o botão de Cofrinhos aqui */}
                            <VaultDialog accountId={account.id} vaults={account.vaults} />
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <AccountModal 
                                account={{ ...account, balance: Number(account.balance) }} 
                            />
                            <DeleteAccountButton id={account.id} name={account.name} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            ))}
        </div>
      )}
    </div>
  );
}