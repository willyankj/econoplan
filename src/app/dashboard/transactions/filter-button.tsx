'use client';

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface FilterButtonProps {
  accounts?: any[];
  cards?: any[];
  categories?: any[];
}

export function TransactionFilterButton({ accounts = [], cards = [], categories = [] }: FilterButtonProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'ALL',
    source: searchParams.get('accountId') ? `acc_${searchParams.get('accountId')}` : 
            searchParams.get('cardId') ? `card_${searchParams.get('cardId')}` : 'ALL',
    categoryId: searchParams.get('categoryId') || 'ALL',
    startDate: searchParams.get('from') || '',
    endDate: searchParams.get('to') || ''
  });

  const activeFiltersCount = [
    filters.type !== 'ALL',
    filters.source !== 'ALL',
    filters.categoryId !== 'ALL',
    filters.startDate,
    filters.endDate
  ].filter(Boolean).length;

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
    else params.delete('type');

    params.delete('accountId');
    params.delete('cardId');
    if (filters.source && filters.source !== 'ALL') {
      if (filters.source.startsWith('acc_')) params.set('accountId', filters.source.replace('acc_', ''));
      else if (filters.source.startsWith('card_')) params.set('cardId', filters.source.replace('card_', ''));
    }

    if (filters.categoryId && filters.categoryId !== 'ALL') params.set('categoryId', filters.categoryId);
    else params.delete('categoryId');

    if (filters.startDate) params.set('from', filters.startDate);
    else params.delete('from');

    if (filters.endDate) params.set('to', filters.endDate);
    else params.delete('to');

    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  const handleClear = () => {
    setFilters({ type: 'ALL', source: 'ALL', categoryId: 'ALL', startDate: '', endDate: '' });
    router.push(pathname);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* CORREÇÃO DO BOTÃO */}
        <Button variant="outline" className="bg-background border-input hover:bg-accent hover:text-accent-foreground text-muted-foreground relative">
          <Filter className="w-4 h-4 mr-2" /> 
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      {/* CORREÇÃO DO POPOVER (FUNDO E TEXTO) */}
      <PopoverContent align="end" className="w-80 bg-popover border-border text-popover-foreground p-4 max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-foreground">Filtros Avançados</h4>
            {activeFiltersCount > 0 && (
                <button onClick={handleClear} className="text-xs text-rose-500 hover:text-rose-600 flex items-center transition-colors">
                    <X className="w-3 h-3 mr-1" /> Limpar
                </button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={filters.type} onValueChange={(val) => setFilters({...filters, type: val})}>
              <SelectTrigger className="bg-muted border-border h-8 text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="INCOME">Receitas</SelectItem>
                <SelectItem value="EXPENSE">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Conta / Cartão</Label>
            <Select value={filters.source} onValueChange={(val) => setFilters({...filters, source: val})}>
              <SelectTrigger className="bg-muted border-border h-8 text-foreground"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="ALL">Todas as origens</SelectItem>
                {accounts.length > 0 && (
                    <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Contas</div>
                        {accounts.map(acc => <SelectItem key={acc.id} value={`acc_${acc.id}`}>{acc.name}</SelectItem>)}
                    </>
                )}
                {cards.length > 0 && (
                    <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t border-border mt-1 pt-2">Cartões</div>
                        {cards.map(card => <SelectItem key={card.id} value={`card_${card.id}`}>{card.name}</SelectItem>)}
                    </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select value={filters.categoryId} onValueChange={(val) => setFilters({...filters, categoryId: val})}>
              <SelectTrigger className="bg-muted border-border h-8 text-foreground"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground max-h-[200px]">
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {categories && categories.length > 0 ? (
                    categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))
                ) : (
                    <div className="px-2 py-2 text-xs text-muted-foreground text-center">Nenhuma categoria encontrada</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Período</Label>
            <div className="grid grid-cols-2 gap-2">
                <Input type="date" className="bg-muted border-border h-8 text-xs text-foreground" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
                <Input type="date" className="bg-muted border-border h-8 text-xs text-foreground" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
            </div>
          </div>

          <Button onClick={handleApply} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-8 mt-2">
            Aplicar Filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}