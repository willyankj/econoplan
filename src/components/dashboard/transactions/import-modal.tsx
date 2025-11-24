'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Loader2, ArrowRight, AlertTriangle, X } from "lucide-react";
import { BankLogo } from "@/components/ui/bank-logo";
import Papa from 'papaparse';
import { parse as parseOfx } from 'ofx-js';
import { importTransactions } from '@/app/dashboard/actions';
import { toast } from "sonner";

interface ImportModalProps {
  accounts: any[];
}

export function ImportTransactionsModal({ accounts }: ImportModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState('');
  
  const [parsedRawData, setParsedRawData] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: '', description: '', amount: '', category: '' });

  // ... (Mantenha as funções de lógica inalteradas: handleFileChange, processOFX, processCSV, handleImport, etc.)
  // REPETINDO LÓGICA (RESUMIDA) PARA CONTEXTO DO COMPONENTE:
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!accountId) { toast.error("Selecione a conta."); e.target.value = ""; return; }
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.name.endsWith('.ofx')) await processOFX(f);
    else if (f.name.endsWith('.csv')) processCSV(f);
    else toast.error("Formato inválido");
  };

  const processOFX = async (file: File) => {
      const text = await file.text();
      const data = await parseOfx(text);
      const list = data.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;
      const txs = Array.isArray(list) ? list : [list];
      const norm = txs.map((t: any) => ({
          date: `${t.DTPOSTED.slice(0,4)}-${t.DTPOSTED.slice(4,6)}-${t.DTPOSTED.slice(6,8)}`,
          amount: parseFloat(t.TRNAMT),
          description: t.MEMO || t.NAME,
          category: ''
      }));
      setParsedRawData(norm);
      setSelectedIndices(new Set(norm.map((_: any, i: number) => i)));
      setStep(2);
  };

  const processCSV = (file: File) => {
      Papa.parse(file, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
              setCsvHeaders(res.meta.fields || []);
              setMapping({ date: '', description: '', amount: '', category: '' }); // Reset
              // @ts-ignore
              setParsedRawData(res.data);
              // @ts-ignore
              setSelectedIndices(new Set(res.data.map((_: any, i: number) => i)));
              setStep(2);
          }
      });
  };

  const previewData = useMemo(() => {
      if (!file) return [];
      if (file.name.endsWith('.ofx')) return parsedRawData;
      return parsedRawData.map(row => {
          let amt = row[mapping.amount];
          let val = 0;
          if (typeof amt === 'string') {
              amt = amt.replace('R$', '').trim();
              if (amt.includes(',') && amt.includes('.')) amt = amt.replace(/\./g, '').replace(',', '.');
              else if (amt.includes(',')) amt = amt.replace(',', '.');
              val = parseFloat(amt);
          } else if (typeof amt === 'number') val = amt;

          let dt = row[mapping.date];
          if (dt && dt.includes('/')) {
              const [d, m, y] = dt.split('/');
              dt = `${y.length === 2 ? '20' + y : y}-${m}-${d}`;
          }
          return {
              description: row[mapping.description] || 'Sem descrição',
              amount: isNaN(val) ? 0 : val,
              date: dt,
              category: row[mapping.category] || ''
          };
      });
  }, [parsedRawData, mapping, file]);

  const toggleSelection = (i: number) => {
      const s = new Set(selectedIndices);
      if (s.has(i)) s.delete(i); else s.add(i);
      setSelectedIndices(s);
  };
  const toggleAll = () => setSelectedIndices(selectedIndices.size === previewData.length ? new Set() : new Set(previewData.map((_, i) => i)));
  
  const handleImport = async () => {
      const data = previewData.filter((_, i) => selectedIndices.has(i));
      if (data.length === 0) return toast.error("Nada selecionado");
      setStep(3);
      const res = await importTransactions(accountId, data);
      if (res?.error) { toast.error(res.error); setStep(2); }
      else { toast.success("Importado!"); setOpen(false); setStep(1); setFile(null); setAccountId(''); }
  };

  const formatMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
            <Upload className="w-4 h-4" /> Importar Extrato
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Importar Transações</DialogTitle></DialogHeader>

        {step === 1 && (
            <div className="space-y-6 py-4">
                <div className="grid gap-2">
                    <Label>Conta de Destino</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="border-2 border-dashed p-10 text-center rounded-xl relative hover:bg-muted/50">
                    <input type="file" accept=".ofx,.csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={!accountId} />
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="w-10 h-10 mb-2 text-emerald-500" />
                        <p>Clique ou arraste OFX/CSV aqui</p>
                    </div>
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="flex flex-col flex-1 overflow-hidden gap-4">
                {file?.name.endsWith('.csv') && (
                    <div className="grid grid-cols-4 gap-2 bg-muted/30 p-3 rounded-lg border shrink-0">
                        {/* INPUTS NA ORDEM DA TABELA */}
                        <div><Label className="text-xs">DATA</Label><Select value={mapping.date} onValueChange={v => setMapping({...mapping, date: v})}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label className="text-xs">CATEGORIA</Label><Select value={mapping.category} onValueChange={v => setMapping({...mapping, category: v})}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Ignorar --</SelectItem>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label className="text-xs">VALOR</Label><Select value={mapping.amount} onValueChange={v => setMapping({...mapping, amount: v})}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label className="text-xs">DESCRIÇÃO</Label><Select value={mapping.description} onValueChange={v => setMapping({...mapping, description: v})}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                )}

                <div className="flex-1 overflow-auto border rounded-md relative">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-10 px-2"><Checkbox checked={selectedIndices.size === previewData.length} onCheckedChange={toggleAll} /></TableHead>
                                <TableHead className="w-[100px]">Data</TableHead>
                                <TableHead className="w-[140px]">Categoria</TableHead>
                                <TableHead className="w-[120px] text-right">Valor</TableHead>
                                <TableHead className="w-auto">Descrição</TableHead> {/* w-auto preenche o resto */}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((row, idx) => (
                                <TableRow key={idx} data-state={selectedIndices.has(idx) ? "selected" : ""}>
                                    <TableCell className="px-2"><Checkbox checked={selectedIndices.has(idx)} onCheckedChange={() => toggleSelection(idx)} /></TableCell>
                                    <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{row.category || <span className="opacity-50 italic">Importados</span>}</TableCell>
                                    <TableCell className={`text-xs text-right font-bold whitespace-nowrap ${row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(row.amount)}</TableCell>
                                    <TableCell className="text-xs font-medium truncate max-w-[300px]" title={row.description}>{row.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">{selectedIndices.size} selecionados</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => { setStep(1); setFile(null); }}>Cancelar</Button>
                        <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={selectedIndices.size === 0}>Confirmar</Button>
                    </div>
                </div>
            </div>
        )}

        {step === 3 && <div className="py-12 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500" /><p>Processando...</p></div>}
      </DialogContent>
    </Dialog>
  );
}