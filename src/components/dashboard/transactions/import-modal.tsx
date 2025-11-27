'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, Loader2, Check, FileText, ArrowRight, Settings2 } from "lucide-react";
import { importTransactions } from '@/app/dashboard/actions';
import { toast } from "sonner";
import { parseOFX, formatCurrency, getCSVPreview, parseCSVWithMapping } from '@/lib/utils'; 

interface ImportModalProps {
  accounts: any[];
  categories: any[];
}

export function ImportTransactionsModal({ accounts, categories }: ImportModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Steps: 1-Upload, 2-Mapping(CSV), 3-Review
  const [step, setStep] = useState(1);
  
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  
  // Estado para CSV
  const [csvContent, setCsvContent] = useState("");
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({ date: 0, description: 1, amount: 2, ignoreHeader: true });

  const [parsedData, setParsedData] = useState<any[]>([]);

  const expenseCats = categories.filter(c => c.type === 'EXPENSE');
  const incomeCats = categories.filter(c => c.type === 'INCOME');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleParseFile = async () => {
    if (!file) return toast.error("Selecione um arquivo");
    
    setIsLoading(true);
    try {
        const text = await file.text();
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (extension === 'ofx') {
            const data = parseOFX(text);
            finalizeParse(data);
        } else if (extension === 'csv') {
            setCsvContent(text);
            const preview = getCSVPreview(text);
            setCsvPreview(preview);
            setStep(2); // Vai para tela de mapeamento
        } else {
            throw new Error("Formato não suportado. Use .OFX ou .CSV");
        }
    } catch (e: any) {
        toast.error(e.message || "Erro ao ler arquivo.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleApplyMapping = () => {
      try {
          const data = parseCSVWithMapping(csvContent, mapping);
          finalizeParse(data);
      } catch (e) {
          toast.error("Erro ao processar CSV. Verifique o mapeamento.");
      }
  };

  const finalizeParse = (data: any[]) => {
      if (data.length === 0) {
          toast.error("Nenhuma transação encontrada.");
          return;
      }
      
      const enrichedData = data.map((t: any, index: number) => ({
          ...t,
          id: index,
          selected: true,
          categoryId: "default"
      }));

      setParsedData(enrichedData);
      setStep(3); // Vai para revisão
  };

  const handleImport = async () => {
      if (!accountId) return toast.error("Selecione a conta de destino.");
      
      const toImport = parsedData
        .filter(item => item.selected)
        .map(item => ({
            date: item.date,
            amount: item.amount,
            description: item.description,
            categoryId: item.categoryId === "default" ? undefined : item.categoryId
        }));

      if (toImport.length === 0) return toast.error("Nenhuma transação selecionada.");

      setIsLoading(true);
      const result = await importTransactions(accountId, toImport);
      setIsLoading(false);
      
      if (result?.error) {
          toast.error(result.error);
      } else {
          toast.success(`${toImport.length} transações importadas!`);
          setOpen(false);
          setStep(1);
          setFile(null);
          setAccountId("");
          setParsedData([]);
      }
  };

  // Funções da Tabela de Revisão
  const toggleSelection = (index: number) => {
      setParsedData(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };
  const toggleAll = (checked: boolean) => {
      setParsedData(prev => prev.map(item => ({ ...item, selected: checked })));
  };
  const updateCategory = (index: number, catId: string) => {
      setParsedData(prev => prev.map((item, i) => i === index ? { ...item, categoryId: catId } : item));
  };
  const applyCategoryToAll = (catId: string) => {
      setParsedData(prev => prev.map(item => ({ ...item, categoryId: catId })));
  };

  const CategorySelect = ({ value, onChange, placeholder = "Automático" }: any) => (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
            <SelectItem value="default" className="text-muted-foreground italic">{placeholder}</SelectItem>
            {expenseCats.length > 0 && <SelectGroup><SelectLabel>Despesas</SelectLabel>{expenseCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>}
            {incomeCats.length > 0 && <SelectGroup><SelectLabel>Receitas</SelectLabel>{incomeCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>}
        </SelectContent>
      </Select>
  );

  // Calcula o número máximo de colunas para renderizar o cabeçalho da prévia
  const maxCols = csvPreview.length > 0 ? Math.max(...csvPreview.map(r => r.length)) : 0;
  const colIndexes = Array.from({ length: maxCols }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Importar</span>
        </Button>
      </DialogTrigger>
      
      {/* CORREÇÃO: Aumentei a largura para o Passo 2 também */}
      <DialogContent className={step >= 2 ? "sm:max-w-4xl max-h-[90vh] flex flex-col" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle>
              {step === 1 && "Importar Extrato"}
              {step === 2 && "Mapear Colunas CSV"}
              {step === 3 && "Revisão Final"}
          </DialogTitle>
        </DialogHeader>

        {/* PASSO 1: UPLOAD */}
        {step === 1 && (
            <div className="grid gap-4 py-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                    <input type="file" accept=".ofx,.csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="p-3 bg-muted rounded-full mb-3">
                        {file ? <FileText className="w-6 h-6 text-emerald-600" /> : <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    {file ? (
                        <div className="text-sm font-medium text-emerald-600 flex items-center gap-2"><Check className="w-4 h-4" /> {file.name}</div>
                    ) : (
                        <>
                            <p className="text-sm font-medium">Clique ou arraste seu arquivo</p>
                            <p className="text-xs text-muted-foreground mt-1">OFX ou CSV</p>
                        </>
                    )}
                </div>
                <Button onClick={handleParseFile} disabled={!file || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar"}
                </Button>
            </div>
        )}

        {/* PASSO 2: MAPEAMENTO CSV (VISUAL CORRIGIDO) */}
        {step === 2 && (
            <div className="flex flex-col gap-6 h-full overflow-hidden">
                
                {/* Seletores de Coluna */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Onde está a DATA?</Label>
                        <Select value={String(mapping.date)} onValueChange={(v) => setMapping({...mapping, date: Number(v)})}>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>{colIndexes.map(i => <SelectItem key={i} value={String(i)}>Coluna {i}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Onde está a DESCRIÇÃO?</Label>
                        <Select value={String(mapping.description)} onValueChange={(v) => setMapping({...mapping, description: Number(v)})}>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>{colIndexes.map(i => <SelectItem key={i} value={String(i)}>Coluna {i}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Onde está o VALOR?</Label>
                        <Select value={String(mapping.amount)} onValueChange={(v) => setMapping({...mapping, amount: Number(v)})}>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>{colIndexes.map(i => <SelectItem key={i} value={String(i)}>Coluna {i}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabela de Prévia (Substituindo o visual embaraçado) */}
                <div className="flex-1 border border-border rounded-md overflow-auto min-h-[200px]">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0">
                            <TableRow>
                                {colIndexes.map(i => (
                                    <TableHead key={i} className="whitespace-nowrap text-xs font-bold text-center border-r last:border-r-0 h-8">
                                        Coluna {i}
                                        {mapping.date === i && <span className="ml-1 text-blue-500">(Data)</span>}
                                        {mapping.description === i && <span className="ml-1 text-purple-500">(Desc)</span>}
                                        {mapping.amount === i && <span className="ml-1 text-emerald-500">(Valor)</span>}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {csvPreview.map((row, rowIndex) => (
                                <TableRow key={rowIndex} className={mapping.ignoreHeader && rowIndex === 0 ? "opacity-40 bg-muted/50 line-through decoration-muted-foreground" : ""}>
                                    {colIndexes.map(colIndex => (
                                        <TableCell key={colIndex} className="text-xs border-r last:border-r-0 py-2">
                                            {row[colIndex] || ""}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="header" checked={mapping.ignoreHeader} onCheckedChange={(c) => setMapping({...mapping, ignoreHeader: c as boolean})} />
                        <Label htmlFor="header" className="text-sm cursor-pointer">Ignorar primeira linha (Cabeçalho)</Label>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
                        <Button onClick={handleApplyMapping} className="bg-purple-600 hover:bg-purple-500 text-white">
                            <Settings2 className="w-4 h-4 mr-2" /> Processar e Revisar
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* PASSO 3: REVISÃO (TABELA FINAL) */}
        {step === 3 && (
            <div className="flex flex-col gap-4 overflow-hidden h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border">
                    <div className="grid gap-1">
                        <Label className="text-xs">Conta de Destino</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs">Aplicar Categoria em Tudo</Label>
                        <CategorySelect value="default" onChange={applyCategoryToAll} placeholder="Escolher para todos..." />
                    </div>
                </div>

                <div className="border border-border rounded-md flex-1 overflow-y-auto min-h-[300px]">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[40px]"><Checkbox checked={parsedData.every(i => i.selected)} onCheckedChange={(c) => toggleAll(c as boolean)} /></TableHead>
                                <TableHead className="w-[100px]">Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead className="w-[180px]">Categoria</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedData.map((t, index) => (
                                <TableRow key={index} className={!t.selected ? "opacity-50 bg-muted/30" : ""}>
                                    <TableCell><Checkbox checked={t.selected} onCheckedChange={() => toggleSelection(index)} /></TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="text-xs font-medium max-w-[200px] truncate" title={t.description}>{t.description}</TableCell>
                                    <TableCell className={`text-xs font-bold whitespace-nowrap ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(t.amount)}</TableCell>
                                    <TableCell>
                                        {t.selected && <CategorySelect value={t.categoryId} onChange={(val: string) => updateCategory(index, val)} />}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-between items-center border-t border-border pt-4 mt-auto">
                    <div className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{parsedData.filter(i => i.selected).length}</span> selecionados</div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setStep(1)}>Cancelar</Button>
                        <Button onClick={handleImport} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar <ArrowRight className="w-4 h-4" /></>}
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}