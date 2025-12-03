'use client';

import { DataFilter } from "@/components/ui/data-filter";
import { BankLogo } from "@/components/ui/bank-logo";

interface TransactionFilterButtonProps {
  accounts: any[];
  cards: any[];
  categories: any[];
}

export function TransactionFilterButton({ accounts, cards, categories }: TransactionFilterButtonProps) {

  const filterConfig = [
      {
          key: "type",
          label: "Tipo de Transação",
          options: [
              { label: "Receitas", value: "INCOME" },
              { label: "Despesas", value: "EXPENSE" },
              { label: "Transferências", value: "TRANSFER" },
              { label: "Investimentos (Metas)", value: "INVESTMENT" },
          ]
      },
      {
          key: "accountId",
          label: "Conta Bancária",
          options: accounts.map(acc => ({
              label: (
                  <div className="flex items-center gap-2">
                      <BankLogo bankName={acc.bank} className="w-3 h-3" />
                      {acc.name}
                  </div>
              ),
              value: acc.id
          }))
      },
      {
          key: "cardId",
          label: "Cartão de Crédito",
          options: cards.map(card => ({
              label: card.name,
              value: card.id
          }))
      },
      {
          key: "categoryId",
          label: "Categoria",
          options: categories.map(cat => ({
              label: cat.name,
              value: cat.id
          }))
      }
  ];

  return <DataFilter filters={filterConfig} />;
}
