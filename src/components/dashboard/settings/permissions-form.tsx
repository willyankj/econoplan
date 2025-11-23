'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateTenantSettings } from "@/app/dashboard/actions";
import { Loader2, Lock, Shield, User } from "lucide-react";
import { DEFAULT_TENANT_SETTINGS, PERMISSION_MODULES } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

interface Props {
  settings: any;
  isOwner: boolean;
}

export function PermissionsForm({ settings, isOwner }: Props) {
  const defaultMember = DEFAULT_TENANT_SETTINGS.permissions.member;
  const defaultAdmin = DEFAULT_TENANT_SETTINGS.permissions.admin;

  const [localSettings, setLocalSettings] = useState({
    permissions: {
      member: { ...defaultMember, ...(settings?.permissions?.member || {}) },
      admin: { ...defaultAdmin, ...(settings?.permissions?.admin || {}) }
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = (role: 'member' | 'admin', permission: string, value: boolean) => {
    if (!isOwner) return;
    setLocalSettings(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: {
          // @ts-ignore
          ...prev.permissions[role],
          [permission]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    await updateTenantSettings(localSettings);
    setIsLoading(false);
    toast.success("Regras de acesso atualizadas com sucesso!");
  };

  const renderModules = (role: 'member' | 'admin') => (
    <Accordion type="single" collapsible className="w-full">
      {PERMISSION_MODULES.map((module) => (
        <AccordionItem key={module.key} value={module.key} className="border-border">
          <AccordionTrigger className="text-foreground hover:no-underline">
            <span className="text-sm font-semibold">{module.label}</span>
          </AccordionTrigger>
          <AccordionContent>
             <div className="space-y-4 pt-2 px-1">
               {module.permissions.map((perm) => (
                 <div key={perm.key} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="space-y-0.5">
                        <Label className="text-sm text-foreground font-medium">{perm.label}</Label>
                        <p className="text-xs text-muted-foreground">{perm.desc}</p>
                    </div>
                    <Switch 
                        // @ts-ignore
                        checked={localSettings.permissions[role][perm.key]}
                        onCheckedChange={(v) => handleToggle(role, perm.key, v)}
                        disabled={!isOwner}
                        className="data-[state=checked]:bg-emerald-600"
                    />
                 </div>
               ))}
             </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  if (!isOwner) {
    return (
        <div className="flex items-center justify-center gap-2 p-12 bg-muted/50 rounded border border-border text-muted-foreground">
            <Lock className="w-5 h-5" />
            <p>Apenas o Proprietário pode gerenciar as permissões de acesso.</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="member" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
            <TabsTrigger value="member" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
                <User className="w-4 h-4 mr-2" /> Acesso de Membro
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
                <Shield className="w-4 h-4 mr-2" /> Acesso de Admin
            </TabsTrigger>
        </TabsList>

        <TabsContent value="member" className="mt-4">
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground">Regras para Membros</CardTitle>
                    <CardDescription className="text-muted-foreground">Defina o que usuários comuns podem fazer.</CardDescription>
                </CardHeader>
                <CardContent>{renderModules('member')}</CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground">Regras para Administradores</CardTitle>
                    <CardDescription className="text-muted-foreground">Defina os limites dos gerentes.</CardDescription>
                </CardHeader>
                <CardContent>{renderModules('admin')}</CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end sticky bottom-4">
        <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px] shadow-xl">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar Regras'}
        </Button>
      </div>
    </div>
  );
}