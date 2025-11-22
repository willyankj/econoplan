'use client';

import { Building2, Wallet, CreditCard } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface BankLogoProps {
  bankName: string;
  className?: string;
}

export function BankLogo({ bankName, className = "w-8 h-8" }: BankLogoProps) {
  const [error, setError] = useState(false);
  const name = bankName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Mapeamento de Domínios Oficiais para buscar o logo colorido
  let domain = "";
  
  if (name.includes("nu") || name.includes("nubank")) domain = "nubank.com.br";
  else if (name.includes("itau")) domain = "itau.com.br";
  else if (name.includes("bradesco")) domain = "bradesco.com.br";
  else if (name.includes("brasil") || name.includes("bb")) domain = "bb.com.br";
  else if (name.includes("santander")) domain = "santander.com.br";
  else if (name.includes("inter")) domain = "inter.co";
  else if (name.includes("caixa")) domain = "caixa.gov.br";
  else if (name.includes("safra")) domain = "safra.com.br";
  else if (name.includes("sicoob")) domain = "sicoob.com.br";
  else if (name.includes("sicredi")) domain = "sicredi.com.br";
  else if (name.includes("citi")) domain = "citibank.com.br";
  else if (name.includes("hsbc")) domain = "hsbc.com.br";
  else if (name.includes("original")) domain = "original.com.br";
  else if (name.includes("banrisul")) domain = "banrisul.com.br";
  else if (name.includes("nordeste")) domain = "bnb.gov.br";
  else if (name.includes("amazonia")) domain = "bancoamazonia.com.br";
  else if (name.includes("xp")) domain = "xpi.com.br";
  else if (name.includes("btg")) domain = "btgpactual.com";
  else if (name.includes("c6")) domain = "c6bank.com.br";
  else if (name.includes("neon")) domain = "neon.com.br";
  else if (name.includes("pagbank") || name.includes("pagseguro")) domain = "pagseguro.uol.com.br";
  else if (name.includes("picpay")) domain = "picpay.com";
  else if (name.includes("nomad")) domain = "nomadglobal.com";
  else if (name.includes("wise")) domain = "wise.com";
  else if (name.includes("mercadopago")) domain = "mercadopago.com.br";
  else if (name.includes("stone")) domain = "stone.com.br";
  else if (name.includes("binance")) domain = "binance.com";
  
  // Ícones Genéricos (Se não for banco)
  const isGenericWallet = name.includes("carteira") || name.includes("dinheiro") || name.includes("bolso") || name.includes("caixa fisica");
  const isGenericCard = name.includes("cartao") || name.includes("credito");

  if (isGenericWallet) return <Wallet className={`${className} text-emerald-500`} />;
  if (isGenericCard) return <CreditCard className={`${className} text-slate-500`} />;

  // Se achou um domínio e não deu erro ainda, tenta mostrar o logo
  if (domain && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img 
        src={`https://logo.clearbit.com/${domain}`}
        alt={bankName} 
        className={`${className} object-contain rounded-full`} 
        onError={() => setError(true)} // Se falhar, ativa o fallback
      />
    );
  }

  // Fallback Final (Predinho Genérico)
  return <Building2 className={`${className} text-muted-foreground`} />;
}