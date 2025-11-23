'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteTransaction } from "../actions";
import { toast } from "sonner"; // <--- IMPORTANTE

export function DeleteTransactionButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    
    setLoading(true);
    const result = await deleteTransaction(id);
    setLoading(false);

    if (result?.error) {
        toast.error("Não permitido", { description: result.error });
    } else {
        toast.success("Transação excluída.");
    }
  }

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8"
        onClick={handleDelete}
        disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}