'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCreditCard } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import { EditCardModal } from "./edit-card-modal";

interface CardActionsProps {
  card: any;
  accounts: any[];
}

export function CardActions({ card, accounts }: CardActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        {/* CORREÇÃO DE CORES AQUI */}
        <DropdownMenuContent align="end" className="bg-card border-border text-card-foreground">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem onClick={() => setShowEdit(true)} className="cursor-pointer hover:bg-muted focus:bg-muted">
            <Pencil className="w-4 h-4 mr-2 text-blue-500" /> Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => router.push(`/dashboard/transactions?cardId=${card.id}`)} 
            className="cursor-pointer hover:bg-muted focus:bg-muted"
          >
            <FileText className="w-4 h-4 mr-2 text-emerald-500" /> Ver Extrato
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem 
            onClick={async () => {
                if(confirm("Tem certeza? Isso apagará o histórico deste cartão.")) {
                    await deleteCreditCard(card.id);
                }
            }}
            className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCardModal 
        card={card} 
        accounts={accounts} 
        open={showEdit} 
        onOpenChange={setShowEdit} 
      />
    </>
  );
}