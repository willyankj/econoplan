import { TransactionType } from "@prisma/client";

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
