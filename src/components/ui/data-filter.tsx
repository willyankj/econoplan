"use client"

import * as React from "react"
import { Filter, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export interface FilterOption {
    key: string;
    label: string;
    placeholder?: string;
    options: { label: string | React.ReactNode; value: string }[];
}

interface DataFilterProps {
  title?: string;
  filters: FilterOption[];
  className?: string;
}

export function DataFilter({ title = "Filtros", filters, className }: DataFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  // Calcula quantos filtros estão ativos (diferentes de 'ALL' ou vazio)
  const activeCount = filters.reduce((acc, filter) => {
      const val = searchParams.get(filter.key);
      return acc + (val && val !== 'ALL' ? 1 : 0);
  }, 0);

  const handleApply = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    filters.forEach(f => params.delete(f.key));
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-8 gap-2 relative border-dashed bg-background", className)}>
          <Filter className="w-3.5 h-3.5" />
          {title}
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
            <h4 className="font-medium leading-none text-sm">{title}</h4>
            {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3 mr-1" /> Limpar
                </Button>
            )}
          </div>
          <Separator />

          <div className="space-y-3">
            {filters.map((filter) => {
                const currentValue = searchParams.get(filter.key) || "ALL";
                return (
                    <div key={filter.key} className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">{filter.label}</Label>
                        <Select value={currentValue} onValueChange={(v) => handleApply(filter.key, v)}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={filter.placeholder || "Todos"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="text-xs text-muted-foreground">Todos</SelectItem>
                                {filter.options.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
