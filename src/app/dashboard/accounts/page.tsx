import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewAccountModal } from "@/components/dashboard/accounts/new-account-modal";
import { EditAccountModal } from "@/components/dashboard/accounts/edit-account-modal";
import { BankLogo } from "@/components/ui/bank-logo";
import { deleteAccount } from "@/app/dashboard/actions";
import { getUserWorkspace } from "@/lib/get-user-workspace"; // Importante

export default async function AccountsPage() {
  // CORREÇÃO: Usa a função correta para pegar o workspace ativo
  const { workspaceId } = await getUserWorkspace();
  
  if (!workspaceId) return <div>Selecione um workspace</div>;

  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId }, // Usa o ID correto
    orderBy: { balance: 'desc' }
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
        <NewAccountModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className="relative overflow-hidden bg-card border-border shadow-sm hover:border-primary/50 transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-3">
                <BankLogo bankName={account.bank} className="w-8 h-8" />
                <span className="capitalize text-foreground">{account.bank}</span>
              </CardTitle>
              
              {account.name.toLowerCase().includes('carteira') ? 
                <Wallet className="w-5 h-5 text-muted-foreground" /> : 
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              }
            </CardHeader>
            
            <CardContent>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo Atual</p>
                <h3 className={`text-2xl font-bold ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                  {formatCurrency(Number(account.balance))}
                </h3>
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{account.name}</p>
                
                <div className="flex items-center">
                   <EditAccountModal 
                      account={{ ...account, balance: Number(account.balance) }} 
                   />
                   <form action={async () => { 'use server'; await deleteAccount(account.id); }}>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10">
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </form>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
