'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as Icons from "lucide-react";
import { upsertCategory } from "@/app/dashboard/actions/categories";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface Props {
  categories: Category[];
  type: "INCOME" | "EXPENSE";
  defaultValue?: string; 
}

export function CategoryCombobox({ categories, type, defaultValue = "" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [search, setSearch] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Filtragem manual simples (Resolve o problema de não encontrar)
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!search.trim()) return;
    
    setIsCreating(true);
    const formData = new FormData();
    formData.append("name", search);
    formData.append("type", type);
    formData.append("icon", "Tag");
    formData.append("color", "#94a3b8");

    const result = await upsertCategory(formData);
    setIsCreating(false);

    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Categoria criada!");
        setValue(search);
        setOpen(false);
        setSearch("");
    }
  };

  const handleSelect = (categoryName: string) => {
      // Define o valor e fecha o popover
      setValue(categoryName === value ? "" : categoryName);
      setOpen(false);
  };

  return (
    <>
    {/* Input hidden para enviar o dado no formulário */}
    <input type="hidden" name="category" value={value} />
    
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-muted/50 border-border text-foreground h-11 font-normal"
        >
          {value ? (
             <div className="flex items-center gap-2">
                {(() => {
                   // Busca insensível a maiúsculas/minúsculas para exibir corretamente
                   const cat = categories.find((c) => c.name.toLowerCase() === value.toLowerCase());
                   if (cat) {
                      // @ts-ignore
                      const Icon = Icons[cat.icon] || Icons.Tag;
                      return (
                          <>
                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: (cat.color || '#94a3b8') + '20' }}>
                                <Icon className="w-3 h-3" style={{ color: cat.color || 'inherit' }} />
                            </div>
                            {cat.name}
                          </>
                      )
                   }
                   return value;
                })()}
             </div>
          ) : (
            <span className="text-muted-foreground">Selecione a categoria...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      {/* z-[9999] garante que fique acima de qualquer modal */}
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-popover text-popover-foreground shadow-xl border border-border rounded-lg overflow-hidden z-[9999]" 
        align="start"
      >
        
        {/* Campo de Busca Customizado (Nativo, sem biblioteca de Command) */}
        <div className="flex items-center border-b border-border px-3 bg-muted/20">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Buscar ou criar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          {search && (
            <button onClick={() => setSearch("")} className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" type="button">
                <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Lista de Itens Customizada */}
        <div className="max-h-[240px] overflow-y-auto p-1 scrollbar-thin">
            
            {/* Estado Vazio / Criar */}
            {filteredCategories.length === 0 && (
                <div className="py-4 text-center text-sm">
                    {search.trim() !== "" ? (
                        <div className="px-2 flex flex-col gap-2">
                            <p className="text-muted-foreground text-xs">Nenhuma categoria encontrada.</p>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="w-full h-8 gap-2 text-xs" 
                                onClick={handleCreate}
                                disabled={isCreating}
                                type="button" // Importante para não submeter o form principal
                            >
                                {isCreating ? <Icons.Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Criar "{search}"
                            </Button>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-xs py-2">Digite para buscar...</p>
                    )}
                </div>
            )}

            {/* Lista de Categorias */}
            {filteredCategories.length > 0 && (
                <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Sugestões
                    </div>
                    {filteredCategories.map((category) => {
                        // @ts-ignore
                        const Icon = Icons[category.icon] || Icons.Tag;
                        const isSelected = value.toLowerCase() === category.name.toLowerCase();
                        
                        return (
                            <div
                                key={category.id}
                                onClick={() => handleSelect(category.name)}
                                className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    isSelected && "bg-accent/50 text-accent-foreground font-medium"
                                )}
                            >
                                <div className={cn("mr-2 flex items-center justify-center w-4 h-4", isSelected ? "opacity-100" : "opacity-0")}>
                                    <Check className="w-4 h-4 text-emerald-500" />
                                </div>
                                
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center border border-border/50" style={{ backgroundColor: (category.color || '#94a3b8') + '15' }}>
                                        <Icon className="w-3.5 h-3.5" style={{ color: category.color || 'inherit' }} />
                                    </div>
                                    {category.name}
                                </div>
                            </div>
                        )
                    })}
                </>
            )}
        </div>
      </PopoverContent>
    </Popover>
    </>
  )
}