import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Users, Shield, CreditCard, Trash2, Briefcase, ScrollText } from "lucide-react";
import { updateTenantName, removeMember } from "@/app/dashboard/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PermissionsForm } from "@/components/dashboard/settings/permissions-form";
import { InviteMemberForm } from "@/components/dashboard/settings/invite-member-form";
import { ManageAccessModal } from "@/components/dashboard/settings/manage-access-modal";
import { EditWorkspaceModal } from "@/components/dashboard/settings/edit-workspace-modal"; 
import { EditRoleModal } from "@/components/dashboard/settings/edit-role-modal"; 
import { AuditList } from "@/components/dashboard/settings/audit-list"; 
import { BillingTab } from "@/components/dashboard/settings/billing-tab"; 
import { DeleteWorkspaceDialog } from "@/components/dashboard/settings/delete-workspace-dialog";
import { DEFAULT_TENANT_SETTINGS } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { 
        tenant: {
            include: { 
                users: {
                    include: { workspaces: true },
                    orderBy: { name: 'asc' }
                },
                workspaces: {
                    orderBy: { name: 'asc' }
                }
            } 
        } 
    }
  });

  if (!user || !user.tenant) {
      return <div className="p-8 text-center">Organização não encontrada.</div>;
  }

  const tenant = user.tenant;
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const isOwner = user.role === 'OWNER';

  const currentSettings = (tenant.settings || DEFAULT_TENANT_SETTINGS) as any;

  // --- BLINDAGEM DE ARRAYS ---
  // Garante que nunca seja undefined/null
  const workspaces = Array.isArray(tenant.workspaces) ? tenant.workspaces : [];
  const users = Array.isArray(tenant.users) ? tenant.users : [];

  let auditLogs: any[] = [];
  if (isOwner) {
      try {
          const logs = await prisma.auditLog.findMany({
              where: { tenantId: tenant.id },
              include: { user: { select: { email: true } } },
              orderBy: { createdAt: 'desc' },
              take: 50
          });
          auditLogs = Array.isArray(logs) ? logs : [];
      } catch (e) {
          console.error("Erro audit:", e);
          auditLogs = [];
      }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gestão da Organização</h2>
        <p className="text-muted-foreground">Configure sua empresa e permissões de acesso.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-card border border-border w-full justify-start h-14 p-1 gap-2 overflow-x-auto">
          <TabsTrigger value="general" className="h-10 px-4"><Building2 className="w-4 h-4 mr-2" /> Geral</TabsTrigger>
          <TabsTrigger value="permissions" className="h-10 px-4"><Shield className="w-4 h-4 mr-2" /> Permissões</TabsTrigger>
          {isOwner && <TabsTrigger value="billing" className="h-10 px-4"><CreditCard className="w-4 h-4 mr-2" /> Assinatura</TabsTrigger>}
          {isOwner && <TabsTrigger value="audit" className="h-10 px-4"><ScrollText className="w-4 h-4 mr-2" /> Auditoria</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-500" /> Perfil da Organização
                    </CardTitle>
                    <CardDescription>Dados visíveis para todos os membros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async (formData) => { 'use server'; await updateTenantName(formData); }} className="flex gap-4 items-end">
                        <div className="grid w-full gap-2">
                            <Label>Nome da Empresa / Família</Label>
                            <Input name="name" defaultValue={tenant.name} disabled={!isAdmin} className="bg-muted" />
                        </div>
                        {isAdmin && <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white"><Save className="w-4 h-4 mr-2" /> Salvar</Button>}
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-500" /> Workspaces Ativos ({workspaces.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {workspaces.map((ws) => (
                        <div key={ws.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold border border-border">{ws.name.charAt(0).toUpperCase()}</div>
                                <p className="text-sm font-medium">{ws.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {isAdmin && <EditWorkspaceModal workspace={ws} />}
                                {isAdmin && workspaces.length > 1 && <DeleteWorkspaceDialog workspaceId={ws.id} workspaceName={ws.name} />}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" /> Membros ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Passando workspaces blindado */}
                    {isAdmin && <InviteMemberForm workspaces={workspaces} />}
                    <div className="space-y-3">
                        {users.map((u) => {
                            // BLINDAGEM EXTRA: userWorkspacesList sempre será array de strings
                            const userWorkspacesList = Array.isArray(u.workspaces) 
                                ? u.workspaces.map(wm => wm.workspaceId) 
                                : [];

                            return (
                                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-border">
                                            <AvatarImage src={u.image || ''} />
                                            <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{u.name || 'Convidado'}</p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <EditRoleModal user={{ id: u.id, name: u.name, role: u.role }} currentUserRole={user.role} />
                                        {isAdmin && (
                                            <ManageAccessModal 
                                                user={u} 
                                                allWorkspaces={workspaces} 
                                                userWorkspaces={userWorkspacesList} 
                                            />
                                        )}
                                        {isAdmin && u.id !== user.id && u.role !== 'OWNER' && (
                                            <form action={async () => { 'use server'; await removeMember(u.id); }}>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
             <PermissionsForm settings={currentSettings} isOwner={isOwner} />
        </TabsContent>

        {isOwner && <TabsContent value="billing" className="mt-6"><BillingTab /></TabsContent>}
        {isOwner && <TabsContent value="audit" className="mt-6"><AuditList logs={auditLogs} /></TabsContent>}
      </Tabs>
    </div>
  );
}