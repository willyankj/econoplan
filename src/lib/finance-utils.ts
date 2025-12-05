import { TransactionType } from "@prisma/client";
import { addMonths, subMonths, startOfDay, endOfDay, isBefore, isAfter, isSameDay, endOfMonth } from "date-fns";

// ============================================================================
// CONSTANTES DE TIPOS
// ============================================================================
export const TRANSACTION_TYPES = {
    INCOME: 'INCOME' as TransactionType,
    EXPENSE: 'EXPENSE' as TransactionType,
    TRANSFER: 'TRANSFER' as TransactionType,
    VAULT_DEPOSIT: 'VAULT_DEPOSIT' as TransactionType,
    VAULT_WITHDRAW: 'VAULT_WITHDRAW' as TransactionType,
};

export const OPERATIONAL_TYPES = [TRANSACTION_TYPES.INCOME, TRANSACTION_TYPES.EXPENSE];
export const INVESTMENT_TYPES = [TRANSACTION_TYPES.VAULT_DEPOSIT, TRANSACTION_TYPES.VAULT_WITHDRAW];

// ============================================================================
// CONVERSÃO DE VALORES
// ============================================================================
export const toDecimal = (num: any): number => Number(num) || 0;

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// ============================================================================
// CLASSIFICAÇÃO E NORMALIZAÇÃO
// ============================================================================

/**
 * Retorna o "sentido" da transação para cálculos de fluxo de caixa da Conta Corrente.
 * - Receita: +1
 * - Despesa: -1
 * - Transferência: 0 (Neutro no total global, mas afeta contas individuais)
 * - Aporte (Investimento): -1 (Sai da conta corrente)
 * - Resgate (Investimento): +1 (Entra na conta corrente)
 */
export const getCashFlowMultiplier = (type: TransactionType | string): number => {
    switch (type) {
        case 'INCOME': return 1;
        case 'EXPENSE': return -1;
        case 'VAULT_DEPOSIT': return -1; // Sai dinheiro da conta
        case 'VAULT_WITHDRAW': return 1; // Entra dinheiro na conta
        case 'TRANSFER': return 0;       // Depende do contexto, mas globalmente é neutro
        default: return 0;
    }
};

/**
 * Retorna o "sentido" da transação para cálculos de Patrimônio Líquido.
 * - Receita: +1
 * - Despesa: -1
 * - Transferência: 0 (Mudança de bolso)
 * - Aporte: 0 (Mudança de bolso: Conta -> Cofrinho)
 * - Resgate: 0 (Mudança de bolso: Cofrinho -> Conta)
 */
export const getNetWorthMultiplier = (type: TransactionType | string): number => {
    switch (type) {
        case 'INCOME': return 1;
        case 'EXPENSE': return -1;
        default: return 0;
    }
};

/**
 * Agrupa os tipos para exibição simplificada
 */
export const normalizeTransactionGroup = (type: TransactionType | string): 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' => {
    if (type === 'INCOME') return 'INCOME';
    if (type === 'EXPENSE') return 'EXPENSE';
    if (type === 'TRANSFER') return 'TRANSFER';
    if (type === 'VAULT_DEPOSIT' || type === 'VAULT_WITHDRAW') return 'INVESTMENT';
    return 'EXPENSE'; // Fallback seguro
};

// ============================================================================
// LÓGICA DE FATURAS DE CARTÃO DE CRÉDITO
// ============================================================================

export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'OVERDUE' | 'PAID' | 'FUTURE';

export interface InvoiceData {
    periodStart: Date;
    periodEnd: Date;
    closingDate: Date;
    dueDate: Date;
    status: InvoiceStatus;
    monthLabel: string; // Ex: "Dezembro"
    isCurrent: boolean;
}

/**
 * Calcula os dados da fatura para um determinado mês de referência.
 * @param closingDay Dia do fechamento da fatura (ex: 3)
 * @param dueDay Dia do vencimento da fatura (ex: 10)
 * @param referenceDate Data de referência para identificar qual fatura queremos (pode ser qualquer dia do mês da fatura desejada)
 */
export const getInvoiceData = (closingDay: number, dueDay: number, referenceDate: Date): InvoiceData => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    // Helper to safely set day (clamping to end of month)
    const getSafeDate = (y: number, m: number, d: number) => {
        const date = new Date(y, m, 1);
        const lastDay = endOfMonth(date).getDate();
        return new Date(y, m, Math.min(d, lastDay));
    };

    // Data de Fechamento da Fatura deste mês
    let closingDate = getSafeDate(year, month, closingDay);

    // Data de Vencimento
    let dueDate = getSafeDate(year, month, dueDay);

    // Ajuste de vencimento se for menor que o fechamento (vira mês seguinte)
    if (dueDay < closingDay) {
        dueDate = addMonths(dueDate, 1);
    }

    // Período de Compras:
    // Termina no dia anterior ao fechamento atual.
    const periodEnd = new Date(closingDate);
    periodEnd.setDate(periodEnd.getDate() - 1);

    // Começa no dia do fechamento do mês anterior.
    // Para garantir segurança em meses com menos dias, usamos subMonths na closingDate
    // Mas precisamos recalcular o "closingDay" no mês anterior para lidar com o problema de 31 -> 28.
    // Ex: Fecha dia 31/03. Mês anterior é Fev. Deve fechar 28/02.
    // subMonths(31/03, 1) -> 28/02.
    // Então prevMonthClosingDate é 28/02.
    // Isso é exatamente o que queremos: dia de fechamento DO mês anterior.
    const prevMonthClosingDate = subMonths(closingDate, 1);

    const periodStart = startOfDay(prevMonthClosingDate);

    // Determinar Status
    let status: InvoiceStatus = 'OPEN';

    // Ajuste de horas para comparação (Início do dia vs Fim do dia)
    const now = new Date();

    // Se hoje é antes da data de fechamento => ABERTA
    if (isBefore(now, startOfDay(closingDate))) {
        status = 'OPEN';
    }
    // Se hoje é depois do fechamento, mas antes do vencimento => FECHADA (Aguardando pagto)
    else if (isAfter(now, startOfDay(closingDate)) && isBefore(now, endOfDay(dueDate))) {
        status = 'CLOSED';
    }
    // Se hoje é depois do vencimento => VENCIDA (assumindo que não foi paga, a verificação de pagto é externa)
    else if (isAfter(now, endOfDay(dueDate))) {
        status = 'OVERDUE';
    }

    // Se a referência for um mês futuro em relação a hoje
    if (isAfter(startOfDay(referenceDate), addMonths(new Date(), 0)) && referenceDate.getMonth() !== new Date().getMonth()) {
         status = 'FUTURE';
    }

    // Label do Mês (Nome do mês da data de fechamento/vencimento)
    const monthLabel = closingDate.toLocaleString('pt-BR', { month: 'long' });

    // isCurrent? É a fatura que está "rolando" hoje?
    // Uma fatura é corrente se HOJE estiver dentro de [periodStart, periodEnd].
    const isCurrent = (isAfter(now, periodStart) || isSameDay(now, periodStart)) &&
                      (isBefore(now, periodEnd) || isSameDay(now, periodEnd));

    return {
        periodStart: startOfDay(periodStart),
        periodEnd: endOfDay(periodEnd),
        closingDate: startOfDay(closingDate),
        dueDate: endOfDay(dueDate),
        status,
        monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        isCurrent
    };
};
