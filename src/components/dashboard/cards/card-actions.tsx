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
import { deleteCreditCard } from '@/app/dashboard/actions/finance';
import { useRouter } from "next/navigation";
import { CardModal } from "./card-modal";
import { toast } from "sonner";

interface CardActionsProps {
  card: any;
  accounts: any[];
  invoiceDates?: { from: string; to: string };
}

export function CardActions({ card, accounts, invoiceDates }: CardActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if(confirm("Tem certeza? Isso apagará o histórico deste cartão.")) {
        const result = await deleteCreditCard(card.id);
        
        if (result?.error) {
            toast.error("Erro ao excluir", { description: result.error });
        } else {
            toast.success("Cartão excluído.");
        }
    }
  };

  const handleViewInvoice = () => {
      let url = `/dashboard/transactions?cardId=${card.id}`;
      if (invoiceDates) {
          url += `&from=${invoiceDates.from}&to=${invoiceDates.to}`;
      }
      router.push(url);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="bg-card border-border text-card-foreground">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem onClick={() => setShowEdit(true)} className="cursor-pointer hover:bg-muted focus:bg-muted">
            <Pencil className="w-4 h-4 mr-2 text-blue-500" /> Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleViewInvoice}
            className="cursor-pointer hover:bg-muted focus:bg-muted"
          >
            <FileText className="w-4 h-4 mr-2 text-emerald-500" /> Ver Fatura
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-border" />
          
          <DropdownMenuItem 
            onClick={handleDelete}
            className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CardModal 
        card={card} 
        accounts={accounts} 
        open={showEdit} 
        onOpenChange={setShowEdit} 
      />
    </>
  );
}
