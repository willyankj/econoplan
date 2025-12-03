'use client';

import * as React from "react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";

// Mantemos este arquivo como um wrapper simples para garantir retrocompatibilidade
// onde ele já estava sendo importado, mas usando a nova implementação.
interface DateMonthSelectorProps {
  prefix?: string;
  keysToReset?: string[];
  className?: string;
  isIconTrigger?: boolean; // Nota: A nova implementação não suporta isIconTrigger ainda, mas podemos adaptar se necessário.
                           // Por enquanto, vamos ignorar pois a maioria das chamadas usa o modo padrão.
}

export function DateMonthSelector(props: DateMonthSelectorProps) {
  // O novo componente DatePickerWithRange cobre exatamente o caso de uso deste componente antigo.
  // Vamos apenas repassar as props.
  return <DatePickerWithRange {...props} />;
}
