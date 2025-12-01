'use client';

// ... (Imports iguais ao original)
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileText, Loader2, CheckCircle, ArrowRight, ArrowLeft, Table as TableIcon, Trash2, AlertTriangle, CheckSquare } from "lucide-react";
import { importTransactions } from '@/app/dashboard/actions'; 
import { toast } from "sonner";
import { BankLogo } from "@/components/ui/bank-logo";
import Papa from 'papaparse';
import { parse as parseOfx } from 'ofx-js';
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ImportModalProps {
  accounts: any[];
  categories: any[];
}

export function ImportTransactionsModal({ accounts, categories }: ImportModalProps) {
  // ... (Estados iniciais iguais ao original)
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: '', description: '', amount: '', category: '' });
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);

  // ... (resetState, handleFileChange, handleDrop, handleFileSelection iguais)
  const resetState = () => {
      setFile(null);
      setAccountId("");
      setStep(1);
      setCsvHeaders([]);
      setParsedTransactions([]);
      setMapping({ date: '', description: '', amount: '', category: '' });
      setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFileSelection(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelection(e.dataTransfer.files[0]);
  };

  const handleFileSelection = async (selectedFile: File) => {
      setFile(selectedFile);
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
          const text = await selectedFile.text();
          Papa.parse(text, {
              header: true, preview: 5, skipEmptyLines: true,
              complete: (results) => {
                  if (results.meta.fields) {
                      setCsvHeaders(results.meta.fields);
                      const initialMap = { date: '', description: '', amount: '', category: '' };
                      results.meta.fields.forEach(h => {
                          const lower = h.toLowerCase();
                          if (['data','date','dt','dia'].some(k => lower.includes(k))) initialMap.date = h;
                          else if (['desc','memo','hist','text'].some(k => lower.includes(k))) initialMap.description = h;
                          else if (['valor','amount','total','vlr'].some(k => lower.includes(k))) initialMap.amount = h;
                          else if (['cat','class'].some(k => lower.includes(k))) initialMap.category = h;
                      });
                      setMapping(initialMap);
                  }
              }
          });
      }
  };

  // ... (Helpers parseDate e parseAmount iguais)
  const parseDate = (dateStr: string) => {
      if (!dateStr) return null;
      dateStr = dateStr.trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('/');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      return null; 
  };

  const parseAmount = (val: string) => {
      if (!val) return 0;
      let clean = val.toString().replace(/[^\d.,-]/g, '');
      if (clean.includes(',') && !clean.includes('.')) clean = clean.replace(',', '.');
      else if (clean.includes('.') && clean.includes(',')) {
          if (clean.indexOf('.') < clean.indexOf(',')) clean = clean.replace(/\./g, '').replace(',', '.');
          else clean = clean.replace(/,/g, '');
      }
      return parseFloat(clean);
  };

  const handleNextStep = async () => {
      if (step === 1) {
          if (!file || !accountId) return toast.error("Selecione arquivo e conta.");
          if (file.name.toLowerCase().endsWith('.csv')) setStep(2);
          else processFile(); 
      } else if (step === 2) {
          if (!mapping.date || !mapping.amount || !mapping.description) return toast.error("Mapeie as colunas obrigatórias.");
          processFile();
      }
  };

  async function processFile() {
    setIsLoading(true);
    try {
        const text = await file!.text();
        let transactions: any[] = [];

        if (file!.name.toLowerCase().endsWith('.csv')) {
            Papa.parse(text, {
                header: true, skipEmptyLines: true,
                complete: (results) => {
                    transactions = results.data.map((row: any, index) => {
                        const dateVal = row[mapping.date];
                        const amountVal = row[mapping.amount];
                        if (!dateVal || !amountVal) return null;

                        const pDate = parseDate(dateVal);
                        const pAmount = parseAmount(amountVal);
                        if (!pDate || isNaN(pAmount)) return null;

                        return {
                            id: index,
                            date: pDate,
                            description: row[mapping.description] || "Sem descrição",
                            amount: pAmount,
                            categoryId: null,
                            categoryName: mapping.category ? row[mapping.category] : null
                        };
                    }).filter(Boolean);
                    setParsedTransactions(transactions);
                    setStep(3);
                    setIsLoading(false);
                }
            });
        } 
        else if (file!.name.toLowerCase().endsWith('.ofx')) {
            const data = await parseOfx(text);
            const bankMsgs = data.OFX.BANKMSGSRSV1 || data.OFX.CREDITCARDMSGSRSV1;
            const stmtTrn = bankMsgs?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN || bankMsgs?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;
            if (stmtTrn) {
                const list = Array.isArray(stmtTrn) ? stmtTrn : [stmtTrn];
                transactions = list.map((t: any, index) => ({
                    id: index,
                    date: t.DTPOSTED.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
                    amount: parseFloat(t.TRNAMT),
                    description: t.MEMO,
                    externalId: t.FITID,
                    categoryId: null
                }));
            }
            setParsedTransactions(transactions);
            setStep(3);
            setIsLoading(false);
        }
    } catch (error) {
        toast.error("Erro ao ler arquivo.");
        setIsLoading(false);
    }
  }

  const handleRemoveTransaction = (id: number) => {
      setParsedTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleCategoryChange = (id: number, catId: string) => {
      setParsedTransactions(prev => prev.map(t => t.id === id ? { ...t, categoryId: catId } : t));
  };

  // --- NOVA LÓGICA DE CHUNKING ---
  const handleFinalImport = async () => {
      setIsLoading(true);
      const CHUNK_SIZE = 500;
      const chunks = [];
      
      for (let i = 0; i < parsedTransactions.length; i += CHUNK_SIZE) {
          chunks.push(parsedTransactions.slice(i, i + CHUNK_SIZE));
      }

      let successCount = 0;
      let errorCount = 0;

      for (const chunk of chunks) {
          const result = await importTransactions(accountId, chunk);
          if (result?.error) {
              errorCount += chunk.length;
              console.error(result.error);
          } else {
              successCount += chunk.length;
          }
      }

      if (errorCount > 0) {
          toast.warning(`Importação parcial: ${successCount} salvos, ${errorCount} falharam.`);
      } else {
          toast.success(`${successCount} transações importadas com sucesso!`);
      }
      
      setOpen(false);
      resetState();
      setIsLoading(false);
  };

  const themeLightBg = "bg-orange-50 dark:bg-orange-950/20";

  // ... (JSX de Renderização igual ao original)
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400">
            <UploadCloud className="w-4 h-4 mr-2" /> Importar
        </Button>
      </DialogTrigger>
      
      <DialogContent className={`bg-card border-border text-card-foreground p-0 gap-0 rounded-xl overflow-hidden ${step === 3 ? 'sm:max-w-[800px]' : 'sm:max-w-[500px]'}`}>
        
        {/* HEADER COM STEPS */}
        <div className={`p-6 pb-6 transition-colors duration-300 ${themeLightBg} flex flex-col items-center border-b border-orange-100 dark:border-orange-900/30`}>
            <DialogHeader className="mb-2 w-full">
                <DialogTitle className="text-center text-muted-foreground font-medium text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                    {step === 1 && "Passo 1: Upload"}
                    {step === 2 && "Passo 2: Mapeamento"}
                    {step === 3 && "Passo 3: Revisão"}
                </DialogTitle>
            </DialogHeader>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-2">
                <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-orange-500' : 'bg-muted'}`} />
                <div className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-orange-500' : 'bg-muted'}`} />
                <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-orange-500' : 'bg-muted'}`} />
                <div className={`h-1 w-8 rounded-full ${step >= 3 ? 'bg-orange-500' : 'bg-muted'}`} />
                <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-orange-500' : 'bg-muted'}`} />
            </div>
        </div>

        <div className="p-6 space-y-6">
            
            {/* --- ETAPA 1: UPLOAD --- */}
            {step === 1 && (
                <div className="space-y-5">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground ml-1">Para qual conta?</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="bg-muted/50 border-transparent h-11 w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        <div className="flex items-center gap-2"><BankLogo bankName={acc.bank} className="w-4 h-4" />{acc.name}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div 
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-muted/50 ${file ? 'border-emerald-500 bg-emerald-50/10' : 'border-border'}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <input ref={fileInputRef} type="file" accept=".ofx,.csv" className="hidden" onChange={handleFileChange} />
                        {file ? (
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6" /></div>
                                <p className="font-medium text-sm text-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto"><UploadCloud className="w-6 h-6" /></div>
                                <p className="font-medium text-sm">Clique ou arraste seu arquivo aqui</p>
                                <p className="text-xs text-muted-foreground">Suporta OFX e CSV</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- ETAPA 2: MAPEAMENTO --- */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-lg flex gap-3">
                        <TableIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Identifique as colunas</p>
                            <p className="text-xs text-blue-600/80 dark:text-blue-400/70">Para garantir que os dados entrem corretamente, nos diga o que cada coluna do seu CSV representa.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold text-orange-600 uppercase">Data *</Label>
                                <Select value={mapping.date} onValueChange={(v) => setMapping({...mapping, date: v})}>
                                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Coluna de Data" /></SelectTrigger>
                                    <SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Descrição *</Label>
                                <Select value={mapping.description} onValueChange={(v) => setMapping({...mapping, description: v})}>
                                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Coluna de Descrição" /></SelectTrigger>
                                    <SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold text-orange-600 uppercase">Valor *</Label>
                                <Select value={mapping.amount} onValueChange={(v) => setMapping({...mapping, amount: v})}>
                                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Coluna de Valor" /></SelectTrigger>
                                    <SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Categoria (Opcional)</Label>
                                <Select value={mapping.category} onValueChange={(v) => setMapping({...mapping, category: v})}>
                                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Ignorar / Manual" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ignore">-- Definir Manualmente --</SelectItem>
                                        {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ETAPA 3: REVISÃO (TABELA) --- */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Revise os dados antes de importar. Você pode alterar categorias ou remover linhas.</p>
                        <Badge variant="outline" className="bg-muted">{parsedTransactions.length} itens</Badge>
                    </div>

                    <div className="border rounded-lg max-h-[350px] overflow-y-auto relative scrollbar-thin">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[100px]">Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="w-[120px]">Valor</TableHead>
                                    <TableHead className="w-[180px]">Categoria</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedTransactions.map((t) => (
                                    <TableRow key={t.id} className="hover:bg-muted/30">
                                        <TableCell className="text-xs whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell className="text-xs truncate max-w-[200px]" title={t.description}>{t.description}</TableCell>
                                        <TableCell className={`text-xs font-medium ${t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {formatCurrency(t.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Select 
                                                value={t.categoryId || "default"} 
                                                onValueChange={(val) => handleCategoryChange(t.id, val)}
                                            >
                                                <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:bg-muted hover:border-border focus:ring-0">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default" disabled>Selecione...</SelectItem>
                                                    {categories.map(cat => (
                                                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-rose-500" onClick={() => handleRemoveTransaction(t.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* --- FOOTER / BOTÕES DE AÇÃO --- */}
            <div className="flex gap-3 pt-2">
                {step > 1 && (
                    <Button variant="ghost" onClick={() => setStep(prev => (prev - 1) as any)} disabled={isLoading} className="text-muted-foreground">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                )}
                
                <Button 
                    onClick={step === 3 ? handleFinalImport : handleNextStep} 
                    disabled={isLoading || (step === 1 && (!file || !accountId))} 
                    className={`flex-1 text-white font-bold h-11 shadow-md bg-orange-500 hover:bg-orange-600 transition-all`}
                >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                        step === 3 ? 'Confirmar e Salvar' : 'Continuar'
                    )}
                    {!isLoading && step < 3 && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}