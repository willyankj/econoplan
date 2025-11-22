'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton({ data }: { data: any[] }) {
  
  const handleExport = () => {
    const headers = ["Descrição", "Categoria", "Data", "Tipo", "Valor"];
    const rows = data.map(t => [
      `"${t.description}"`,
      `"${t.category?.name || 'Geral'}"`,
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.type === 'INCOME' ? 'Receita' : 'Despesa',
      Number(t.amount).toFixed(2).replace('.', ',')
    ]);

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    // CORREÇÃO: Adiciona BOM (\uFEFF) e remove o ponto e vírgula extra no tipo
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `extrato_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button 
      variant="outline" 
      className="bg-background border-input hover:bg-accent text-muted-foreground" 
      onClick={handleExport} 
      disabled={data.length === 0}
    >
      <Download className="w-4 h-4 mr-2" /> Exportar
    </Button>
  );
}
