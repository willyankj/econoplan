import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// --- PARSER OFX ---
export function parseOFX(content: string) {
  const transactions: any[] = [];
  const matches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g);

  if (!matches) return [];

  for (const block of matches) {
    try {
        const amountMatch = block.match(/<TRNAMT>([-0-9.]+)/);
        const dateMatch = block.match(/<DTPOSTED>([0-9]{8})/);
        const memoMatch = block.match(/<MEMO>([^<]+)/);
        const nameMatch = block.match(/<NAME>([^<]+)/);

        if (amountMatch && dateMatch) {
            const amount = parseFloat(amountMatch[1]);
            const rawDate = dateMatch[1];
            const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
            const description = memoMatch ? memoMatch[1].trim() : (nameMatch ? nameMatch[1].trim() : "Sem descrição");

            transactions.push({ amount, date, description, category: null });
        }
    } catch (e) {
        console.error("Erro ao ler transação OFX:", e);
    }
  }
  return transactions;
}

// --- HELPERS PARA CSV ---

// 1. Gera uma prévia das primeiras linhas para o usuário mapear
export function getCSVPreview(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';
  // Retorna as 5 primeiras linhas quebradas em colunas
  return lines.slice(0, 5).map(line => line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '')));
}

// 2. Lê o arquivo usando o mapeamento definido pelo usuário
export function parseCSVWithMapping(content: string, mapping: { date: number, amount: number, description: number, ignoreHeader: boolean }) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  const delimiter = lines[0]?.includes(';') ? ';' : ',';
  const transactions: any[] = [];
  
  const startRow = mapping.ignoreHeader ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      
      // Pula linhas vazias ou incompletas
      if (cols.length <= Math.max(mapping.date, mapping.amount, mapping.description)) continue;

      const date = parseDate(cols[mapping.date]);
      const amount = parseAmount(cols[mapping.amount]);
      const description = cols[mapping.description];

      if (date && !isNaN(amount)) {
          transactions.push({
              date,
              amount,
              description: description || "Sem descrição",
              category: null
          });
      }
  }
  return transactions;
}

// Helpers internos de parse
function parseAmount(val: string) {
    if (!val) return 0;
    val = val.replace('R$', '').trim();
    if (val.includes(',') && !val.includes('.')) return parseFloat(val.replace(',', '.')); // 50,00
    if (val.includes('.') && val.includes(',')) {
        if (val.indexOf('.') < val.indexOf(',')) return parseFloat(val.replace(/\./g, '').replace(',', '.')); // 1.000,00
    }
    return parseFloat(val.replace(/,/g, '')); // 1000.00
}

function parseDate(val: string) {
    if (!val) return null;
    // DD/MM/YYYY
    const dmy = val.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    // YYYY-MM-DD
    const ymd = val.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
    if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    return null;
}