'use client';

import * as Icons from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// 1. Dicionário de Tradução para Busca em PT-BR
const translations: Record<string, string> = {
  "casa": "Home", "lar": "Home", "moradia": "Home",
  "carro": "Car", "veículo": "Car", "transporte": "Car", "uber": "Car",
  "comida": "Utensils", "restaurante": "Utensils", "alimentação": "Utensils", "jantar": "Utensils",
  "mercado": "ShoppingCart", "compras": "ShoppingBag", "loja": "Store",
  "dinheiro": "Banknote", "pagamento": "CreditCard", "pix": "QrCode", "banco": "Landmark",
  "saúde": "Heart", "médico": "Stethoscope", "hospital": "Activity",
  "viagem": "Plane", "férias": "Palmtree", "mala": "Luggage",
  "lazer": "Gamepad2", "jogos": "Gamepad2", "filmes": "Film", "música": "Music",
  "trabalho": "Briefcase", "negócios": "Building2", "escritório": "Building",
  "estudo": "GraduationCap", "escola": "BookOpen", "livro": "Book",
  "academia": "Dumbbell", "esporte": "Trophy",
  "pet": "Dog", "cachorro": "Dog", "gato": "Cat",
  "internet": "Wifi", "telefone": "Phone", "celular": "Smartphone",
  "luz": "Zap", "água": "Droplets",
  "presente": "Gift", "doação": "HeartHandshake"
};

// 2. Ícones Prioritários (Aparecem no topo)
const priorityIcons = [
  "Home", "Car", "Utensils", "ShoppingCart", "CreditCard", "Banknote", 
  "Landmark", "Heart", "Plane", "Briefcase", "GraduationCap", "Zap", 
  "Droplets", "Wifi", "Phone", "Gift", "Gamepad2", "Dumbbell", "Dog"
];

// Filtra apenas ícones válidos do Lucide (remove funções utilitárias)
const allIcons = Object.keys(Icons)
  .filter(key => key !== "createLucideIcon" && key !== "Icon" && /^[A-Z]/.test(key));

export function IconPicker({ selected, onSelect, color, size = 'md' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // @ts-ignore
  const SelectedIcon = Icons[selected] || Icons.Tag; 

  const sizeClass = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-10 h-10",
      xl: "w-14 h-14"
  }[size];

  // Lógica de Filtro Inteligente (PT-BR + EN)
  const getFilteredIcons = () => {
    if (!search) return priorityIcons; // Sem busca, mostra os populares

    const term = search.toLowerCase();
    
    // Verifica se algum termo em PT-BR corresponde à busca e pega o nome em inglês
    const translatedMatches = Object.entries(translations)
        .filter(([pt]) => pt.includes(term))
        .map(([, en]) => en);

    // Filtra lista completa pelo nome em inglês OU pelos termos traduzidos encontrados
    return allIcons.filter(icon => 
        icon.toLowerCase().includes(term) || translatedMatches.includes(icon)
    ).slice(0, 60);
  };

  const displayIcons = getFilteredIcons();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
            variant="ghost" 
            className={`h-full w-full p-0 hover:bg-transparent flex items-center justify-center rounded-full`}
            type="button" 
        >
            <SelectedIcon className={sizeClass} style={{ color: color || 'currentColor' }} />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[320px] p-0 z-50 bg-card border-border" align="center" side="bottom">
        <div className="p-3 border-b border-border">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar (ex: casa, carro, luz)..." 
                    className="pl-8 h-9 bg-muted/50 border-transparent focus:bg-background" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
            </div>
        </div>
        <div className="grid grid-cols-6 gap-1 p-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {displayIcons.map((iconName) => {
                // @ts-ignore
                const Icon = Icons[iconName];
                if (!Icon) return null;
                
                return (
                    <Button
                        key={iconName}
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 hover:bg-muted ${selected === iconName ? 'bg-muted ring-2 ring-primary' : ''}`}
                        onClick={() => {
                            onSelect(iconName);
                            setOpen(false);
                        }}
                        title={iconName} // Mostra o nome ao passar o mouse
                        type="button"
                    >
                        <Icon className="w-5 h-5 text-foreground" />
                    </Button>
                )
            })}
            {displayIcons.length === 0 && (
                <div className="col-span-6 text-center py-8 text-xs text-muted-foreground">
                    Nenhum ícone encontrado para "{search}".
                </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}