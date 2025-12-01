'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null; 
  details: string | null;
  createdAt: Date;
  user: { email: string };
}

// VALOR PADRÃO: logs = []
export function AuditList({ logs = [] }: { logs: AuditLog[] }) {
  
  // Redundância de segurança
  const safeLogs = Array.isArray(logs) ? logs : [];

  const getLink = (log: AuditLog) => {
    if (log.action === 'DELETE') return null;
    switch (log.entity) {
        case 'Transaction':
            const match = log.details?.match(/:\s(.*?)\s\(/); 
            const query = match ? match[1] : "";
            return `/dashboard/transactions?q=${encodeURIComponent(query)}`;
        case 'Budget': return `/dashboard/budgets`;
        case 'Goal': return `/dashboard/goals`;
        case 'Card': return `/dashboard/cards`;
        case 'Account': return `/dashboard/accounts`;
        default: return null;
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
            <ScrollText className="w-5 h-5 text-blue-500" />
            Registro de Auditoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeLogs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado.
                    </TableCell>
                </TableRow>
            ) : (
                safeLogs.map((log) => {
                    const detailsPT = log.details ? log.details.replace("INCOME", "Receita").replace("EXPENSE", "Despesa") : "-";
                    const link = getLink(log);

                    return (
                        <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-xs font-medium truncate max-w-[200px]">
                                {log.user.email}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[10px] font-bold border uppercase whitespace-nowrap">
                                    {log.action} • {log.entity}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground max-w-[250px] truncate" title={detailsPT}>
                                {detailsPT}
                            </TableCell>
                            <TableCell className="text-right">
                                {link && (
                                    <Link href={link}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                                    </Link>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}