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
        case 'Member':
        case 'Access':
        case 'Permissions': return `/dashboard/settings`; 
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
        <CardDescription>
            Histórico detalhado de ações para controle e segurança.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
                {/* Larguras fixas para evitar quebra */}
                <TableHead className="w-[150px] min-w-[150px]">Data/Hora</TableHead>
                <TableHead className="w-[200px] min-w-[150px]">Usuário</TableHead>
                <TableHead className="w-[150px] min-w-[120px]">Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                {/* Garante espaço para o botão */}
                <TableHead className="w-[60px] min-w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado.
                    </TableCell>
                </TableRow>
            ) : (
                logs.map((log) => {
                    const actionPT = ACTION_MAP[log.action] || log.action;
                    const entityPT = ENTITY_MAP[log.entity] || log.entity;
                    const detailsPT = log.details ? log.details.replace("INCOME", "Receita").replace("EXPENSE", "Despesa") : "-";
                    const link = getLink(log);

                    return (
                        <TableRow key={log.id} className="border-border hover:bg-muted/50">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </TableCell>
                            
                            <TableCell className="text-xs font-medium truncate max-w-[200px]" title={log.user.email}>
                                {log.user.email}
                            </TableCell>
                            
                            <TableCell>
                                <Badge variant="outline" className={`text-[10px] font-bold border uppercase whitespace-nowrap
                                    ${log.action === 'DELETE' ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' : 
                                    log.action === 'CREATE' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 
                                    'text-blue-500 border-blue-500/20 bg-blue-500/10'}`}>
                                    {actionPT} • {entityPT}
                                </Badge>
                            </TableCell>
                            
                            {/* TRUNCATE e MAX-WIDTH adicionados aqui */}
                            <TableCell className="text-sm text-foreground max-w-[250px] truncate" title={detailsPT}>
                                {detailsPT}
                            </TableCell>

                            <TableCell className="text-right pr-2">
                                {link && (
                                    <Link href={link} title="Ver item">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-500">
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
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