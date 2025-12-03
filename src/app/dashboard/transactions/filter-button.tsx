'use client';

import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BankLogo } from "@/components/ui/bank-logo";

interface TransactionFilterButtonProps {
  accounts: any[];
  cards: any[];
  categories: any[];
}

export function TransactionFilterButton({ accounts, cards, categories }: TransactionFilterButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Lê os valores atuais da URL
  const type = searchParams.get("type") || "ALL";
  const accountId = searchParams.get("accountId") || "ALL";
  const cardId = searchParams.get("cardId") || "ALL";
  const categoryId = searchParams.get("categoryId") || "ALL";

  const handleApply = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reseta página se houver paginação (opcional)
    // params.delete('page'); 
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("?");
    setOpen(false);
  };

  const activeCount = [type, accountId, cardId, categoryId].filter(v => v !== 'ALL').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 gap-2 relative border-dashed bg-background">
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 ml-1 text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 border-none">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none text-sm">Filtrar Transações</h4>
            {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3 mr-1" /> Limpar
                </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Tipo</Label>
            <Select value={type} onValueChange={(v) => handleApply("type", v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="INCOME">Receitas</SelectItem>
                <SelectItem value="EXPENSE">Despesas</SelectItem>
                <SelectItem value="TRANSFER">Transferências</SelectItem>
                <SelectItem value="INVESTMENT">Metas / Aportes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Conta Bancária</Label>
            <Select value={accountId} onValueChange={(v) => handleApply("accountId", v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                            <BankLogo bankName={acc.bank} className="w-3 h-3" />
                            {acc.name}
                        </div>
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Cartão de Crédito</Label>
            <Select value={cardId} onValueChange={(v) => handleApply("cardId", v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {cards.map(card => (
                    <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Categoria</Label>
            <Select value={categoryId} onValueChange={(v) => handleApply("categoryId", v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="ALL">Todas</SelectItem>
                {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
        </div>
      </PopoverContent>
    </Popover>
  );
}