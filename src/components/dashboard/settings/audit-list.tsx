'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  createdAt: Date;
  user: { email: string };
}

// Dicionários de Tradução
const ACTION_MAP: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Edição",
  DELETE: "Exclusão",
  LOGIN: "Login",
  ACTION: "Ação"
};

const ENTITY_MAP: Record<string, string> = {
  Transaction: "Transação",
  Account: "Conta",
  Card: "Cartão",
  Budget: "Orçamento",
  Goal: "Meta",
  Member: "Membro",
  Workspace: "Workspace",
  Tenant: "Organização",
  Permissions: "Permissões",
  Access: "Acesso"
};

export function AuditList({ logs }: { logs: AuditLog[] }) {
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
            <ScrollText className="w-5 h-5 text-blue-500" />
            Registro de Auditoria
        </CardTitle>
        <CardDescription>
            Histórico de ações importantes realizadas nos últimos 30 dias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado.
                    </TableCell>
                </TableRow>
            ) : (
                logs.map((log) => {
                    const actionPT = ACTION_MAP[log.action] || log.action;
                    const entityPT = ENTITY_MAP[log.entity] || log.entity;
                    
                    // CORREÇÃO: Substitui termos técnicos em inglês que ficaram salvos no banco
                    let detailsPT = log.details || "-";
                    detailsPT = detailsPT.replace("INCOME", "Receita").replace("EXPENSE", "Despesa");

                    return (
                        <TableRow key={log.id} className="border-border hover:bg-muted/50">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                                {log.user.email}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`text-[10px] font-bold border uppercase 
                                    ${log.action === 'DELETE' ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' : 
                                    log.action === 'CREATE' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 
                                    'text-blue-500 border-blue-500/20 bg-blue-500/10'}`}>
                                    {actionPT} de {entityPT}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground">
                                {detailsPT}
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