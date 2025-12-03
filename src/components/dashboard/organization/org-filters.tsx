'use client';

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface OrgFiltersProps {
  workspaces: { id: string; name: string }[];
}

export function OrgFilters({ workspaces }: OrgFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentWs = searchParams.get('filterWorkspace') || 'ALL';
  const currentType = searchParams.get('filterType') || 'ALL';

  const activeCount = (currentWs !== 'ALL' ? 1 : 0) + (currentType !== 'ALL' ? 1 : 0);

  const handleApply = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL') params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('filterWorkspace');
    params.delete('filterType');
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 bg-card border-border hover:bg-accent text-muted-foreground relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card border-border p-4 shadow-xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-foreground">Filtrar Dados</h4>
            {activeCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-rose-500 hover:underline flex items-center">
                    <X className="w-3 h-3 mr-1" /> Limpar
                </button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Filtrar por Workspace</Label>
            <Select value={currentWs} onValueChange={(v) => handleApply('filterWorkspace', v)}>
                <SelectTrigger className="bg-muted border-border h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos os Workspaces</SelectItem>
                    {workspaces.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tipo de Transação</Label>
            <Select value={currentType} onValueChange={(v) => handleApply('filterType', v)}>
                <SelectTrigger className="bg-muted border-border h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="INCOME">Receitas</SelectItem>
                    <SelectItem value="EXPENSE">Despesas</SelectItem>
                    <SelectItem value="TRANSFER">Transferências</SelectItem>
                    <SelectItem value="INVESTMENT">Metas / Aportes</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}