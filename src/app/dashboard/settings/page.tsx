import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Users, Shield, CreditCard, Plus, Trash2, Briefcase } from "lucide-react";
import { updateTenantName, inviteMember, removeMember, deleteWorkspace } from "@/app/dashboard/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PermissionsForm } from "@/components/dashboard/settings/permissions-form";
import { InviteMemberForm } from "@/components/dashboard/settings/invite-member-form";
import { ManageAccessModal } from "@/components/dashboard/settings/manage-access-modal";
import { DEFAULT_TENANT_SETTINGS } from "@/lib/permissions";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { 
        tenant: {
            include: { 
                users: {
                    include: { workspaces: true } 
                },
                workspaces: true
            } 
        } 
    }
  });

  if (!user) return <div>Erro.</div>;
  const tenant = user.tenant;
  
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const isOwner = user.role === 'OWNER';

  const currentSettings = (tenant.settings || DEFAULT_TENANT_SETTINGS) as any;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gestão da Organização</h2>
        <p className="text-muted-foreground">Configure sua empresa e permissões de acesso.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-card border border-border w-full justify-start h-14 p-1 gap-2">
          <TabsTrigger 
            value="general" 
            className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:text-foreground h-10 px-4"
          >
             <Building2 className="w-4 h-4 mr-2" /> Geral
          </TabsTrigger>
          
          <TabsTrigger 
            value="permissions" 
            className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:text-foreground h-10 px-4"
          >
             <Shield className="w-4 h-4 mr-2" /> Permissões & Roles
          </TabsTrigger>
          
          <TabsTrigger 
            value="billing" 
            className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground opacity-50 cursor-not-allowed h-10 px-4" 
            disabled
          >
             <CreditCard className="w-4 h-4 mr-2" /> Cobrança (Em breve)
          </TabsTrigger>
        </TabsList>

        {/* --- ABA GERAL --- */}
        <TabsContent value="general" className="space-y-6 mt-6">
            
            {/* NOME DO TENANT */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-500" />
                        Perfil da Organização
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Dados visíveis para todos os membros.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* CORREÇÃO AQUI: Wrapper assíncrono para satisfazer o TypeScript */}
                    <form 
                      action={async (formData) => {
                        'use server';
                        await updateTenantName(formData);
                      }} 
                      className="flex gap-4 items-end"
                    >
                        <div className="grid w-full gap-2">
                            <Label className="text-foreground">Nome da Empresa / Família</Label>
                            <Input 
                                name="name" 
                                defaultValue={tenant.name} 
                                className="bg-muted border-input text-foreground placeholder:text-muted-foreground"
                                disabled={!isAdmin}
                            />
                        </div>
                        {isAdmin && (
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                <Save className="w-4 h-4 mr-2" /> Salvar
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* WORKSPACES */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-500" />
                        Workspaces Ativos ({tenant.workspaces.length})
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Áreas de trabalho separadas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {tenant.workspaces.map((ws) => (
                        <div key={ws.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-foreground border border-border">
                                    {ws.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{ws.name}</p>
                                    <p className="text-xs text-muted-foreground">ID: {ws.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                            
                            {isAdmin && tenant.workspaces.length > 1 && (
                                <form action={async () => {
                                    'use server';
                                    await deleteWorkspace(ws.id);
                                }}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </form>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* MEMBROS */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        Membros ({tenant.users.length})
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Gerencie quem acessa sua organização.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Formulário de Convite */}
                    {isAdmin && <InviteMemberForm workspaces={tenant.workspaces} />}

                    <div className="space-y-3">
                        {tenant.users.map((u) => (
                            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarImage src={u.image || ''} referrerPolicy="no-referrer" />
                                        <AvatarFallback className="text-xs bg-muted text-foreground">{u.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{u.name || 'Convidado Pendente'}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{u.email}</span>
                                            {u.lastLogin && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                                                    <span>
                                                        Último acesso: {new Date(u.lastLogin).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                                        u.role === 'OWNER' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                        u.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                        'bg-muted text-muted-foreground border-border'
                                    }`}>
                                        {u.role}
                                    </span>

                                    {/* BOTÃO DE GERENCIAR ACESSOS */}
                                    {isAdmin && (
                                        <ManageAccessModal 
                                            user={u} 
                                            allWorkspaces={tenant.workspaces} 
                                            userWorkspaces={u.workspaces.map(wm => wm.workspaceId)} 
                                        />
                                    )}

                                    {isAdmin && u.id !== user.id && u.role !== 'OWNER' && (
                                        <form action={async () => { 'use server'; await removeMember(u.id); }}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- ABA PERMISSÕES --- */}
        <TabsContent value="permissions" className="mt-6">
             <PermissionsForm settings={currentSettings} isOwner={isOwner} />
        </TabsContent>

      </Tabs>
    </div>
  );
}