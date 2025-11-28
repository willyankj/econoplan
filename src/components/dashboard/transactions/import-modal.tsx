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
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  
  const [csvContent, setCsvContent] = useState("");
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({ date: 0, description: 1, amount: 2, ignoreHeader: true });
  const [parsedData, setParsedData] = useState<any[]>([]);

  const expenseCats = categories.filter(c => c.type === 'EXPENSE');
  const incomeCats = categories.filter(c => c.type === 'INCOME');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
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
            setCsvPreview(getCSVPreview(text));
            setStep(2);
        } else throw new Error("Formato não suportado. Use .OFX ou .CSV");
    } catch (e: any) {
        toast.error(e.message || "Erro ao ler arquivo.");
    } finally { setIsLoading(false); }
  };

  const handleApplyMapping = () => {
      try {
          const data = parseCSVWithMapping(csvContent, mapping);
          finalizeParse(data);
      } catch (e) { toast.error("Erro ao processar CSV."); }
  };

  const finalizeParse = (data: any[]) => {
      if (data.length === 0) { toast.error("Nenhuma transação encontrada."); return; }
      const enrichedData = data.map((t: any, index: number) => ({
          ...t, id: index, selected: true, categoryId: "default"
      }));
      setParsedData(enrichedData);
      setStep(3);
  };

  const handleImport = async () => {
      if (!accountId) return toast.error("Selecione a conta de destino.");
      
      const toImport = parsedData
        .filter(item => item.selected)
        .map(item => ({
            date: item.date,
            amount: item.amount,
            description: item.description,
            categoryId: item.categoryId === "default" ? undefined : item.categoryId,
            externalId: item.externalId // <--- IMPORTANTE: Passando o ID do banco
        }));

      if (toImport.length === 0) return toast.error("Nenhuma transação selecionada.");

      setIsLoading(true);
      const result = await importTransactions(accountId, toImport);
      setIsLoading(false);
      
      if (result?.error) toast.error(result.error);
      else {
          toast.success(`${toImport.length} itens processados!`);
          setOpen(false);
          setStep(1);
          setFile(null);
          setAccountId("");
          setParsedData([]);
      }
  };

  // Helpers de Tabela
  const toggleSelection = (idx: number) => setParsedData(p => p.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  const toggleAll = (chk: boolean) => setParsedData(p => p.map(it => ({ ...it, selected: chk })));
  const updateCategory = (idx: number, cId: string) => setParsedData(p => p.map((it, i) => i === idx ? { ...it, categoryId: cId } : it));
  const applyCategoryToAll = (cId: string) => setParsedData(p => p.map(it => ({ ...it, categoryId: cId })));

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

  const maxCols = csvPreview.length > 0 ? Math.max(...csvPreview.map(r => r.length)) : 0;
  const colIndexes = Array.from({ length: maxCols }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Importar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={step >= 2 ? "sm:max-w-4xl max-h-[90vh] flex flex-col" : "sm:max-w-[500px]"}>
        <DialogHeader><DialogTitle>{step === 1 ? "Importar Extrato" : step === 2 ? "Mapear CSV" : "Revisão Final"}</DialogTitle></DialogHeader>

        {step === 1 && (
            <div className="grid gap-4 py-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 relative cursor-pointer">
                    <input type="file" accept=".ofx,.csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="p-3 bg-muted rounded-full mb-3">{file ? <FileText className="w-6 h-6 text-emerald-600" /> : <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />}</div>
                    {file ? <div className="text-sm font-medium text-emerald-600 flex items-center gap-2"><Check className="w-4 h-4" /> {file.name}</div> : <div className="text-sm">Clique ou arraste seu arquivo<br/><span className="text-xs text-muted-foreground">OFX ou CSV</span></div>}
                </div>
                <Button onClick={handleParseFile} disabled={!file || isLoading} className="w-full">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar"}</Button>
            </div>
        )}

        {step === 2 && (
            <div className="flex flex-col gap-6 h-full overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
                    {['DATA', 'DESCRIÇÃO', 'VALOR'].map((label, idx) => (
                        <div key={label} className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Coluna {label}</Label>
                            <Select value={String(Object.values(mapping)[idx])} onValueChange={(v) => setMapping({...mapping, [Object.keys(mapping)[idx]]: Number(v)})}>
                                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>{colIndexes.map(i => <SelectItem key={i} value={String(i)}>Coluna {i}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
                <div className="flex-1 border border-border rounded-md overflow-auto min-h-[200px]">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0"><TableRow>{colIndexes.map(i => <TableHead key={i} className="whitespace-nowrap text-xs text-center border-r h-8">Coluna {i}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>{csvPreview.map((r, ri) => <TableRow key={ri} className={mapping.ignoreHeader && ri === 0 ? "opacity-40 line-through" : ""}>{colIndexes.map(ci => <TableCell key={ci} className="text-xs border-r py-2">{r[ci] || ""}</TableCell>)}</TableRow>)}</TableBody>
                    </Table>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center space-x-2"><Checkbox id="header" checked={mapping.ignoreHeader} onCheckedChange={(c) => setMapping({...mapping, ignoreHeader: c as boolean})} /><Label htmlFor="header" className="text-sm cursor-pointer">Ignorar cabeçalho</Label></div>
                    <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button><Button onClick={handleApplyMapping} className="bg-purple-600 hover:bg-purple-500 text-white"><Settings2 className="w-4 h-4 mr-2" /> Revisar</Button></div>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="flex flex-col gap-4 overflow-hidden h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border">
                    <div className="grid gap-1"><Label className="text-xs">Conta de Destino</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-1"><Label className="text-xs">Aplicar Categoria em Tudo</Label><CategorySelect value="default" onChange={applyCategoryToAll} placeholder="Escolher para todos..." /></div>
                </div>
                <div className="border border-border rounded-md flex-1 overflow-y-auto min-h-[300px]">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10"><TableRow><TableHead className="w-[40px]"><Checkbox checked={parsedData.every(i => i.selected)} onCheckedChange={(c) => toggleAll(c as boolean)} /></TableHead><TableHead className="w-[100px]">Data</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead className="w-[180px]">Categoria</TableHead></TableRow></TableHeader>
                        <TableBody>{parsedData.map((t, index) => <TableRow key={index} className={!t.selected ? "opacity-50 bg-muted/30" : ""}><TableCell><Checkbox checked={t.selected} onCheckedChange={() => toggleSelection(index)} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell><TableCell className="text-xs font-medium max-w-[200px] truncate" title={t.description}>{t.description}</TableCell><TableCell className={`text-xs font-bold whitespace-nowrap ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(t.amount)}</TableCell><TableCell>{t.selected && <CategorySelect value={t.categoryId} onChange={(val: string) => updateCategory(index, val)} />}</TableCell></TableRow>)}</TableBody>
                    </Table>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-4 mt-auto">
                    <div className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{parsedData.filter(i => i.selected).length}</span> selecionados</div>
                    <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}>Cancelar</Button><Button onClick={handleImport} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar <ArrowRight className="w-4 h-4" /></>}</Button></div>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}