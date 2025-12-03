'use client';

import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DataFilter } from "@/components/ui/data-filter";

interface OrgFiltersProps {
    workspaces: { id: string, name: string }[];
}

export function OrgFilters({ workspaces }: OrgFiltersProps) {
    const filters = [
        {
            key: "workspaceId",
            label: "Filtrar por Workspace",
            options: workspaces.map(w => ({ label: w.name, value: w.id }))
        },
        {
            key: "type",
            label: "Tipo de Movimentação",
            options: [
                { label: "Receitas", value: "INCOME" },
                { label: "Despesas", value: "EXPENSE" },
                { label: "Investimentos", value: "INVESTMENT" }
            ]
        }
    ];

    return (
        <div className="flex items-center gap-2">
            <DatePickerWithRange showMonthNavigation={true} />
            <DataFilter filters={filters} title="Filtros Globais" />
        </div>
    );
}
