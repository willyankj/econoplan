'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateTenantSettings } from "@/app/dashboard/actions";
import { Loader2, Lock, Shield, User } from "lucide-react";
import { TenantSettings, DEFAULT_TENANT_SETTINGS, PERMISSION_DEFINITIONS } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  settings: any;
  isOwner: boolean;
}

export function PermissionsForm({ settings, isOwner }: Props) {
  const safeSettings: TenantSettings = {
    permissions: {
      member: { ...DEFAULT_TENANT_SETTINGS.permissions.member, ...(settings?.permissions?.member || {}) },
      admin: { ...DEFAULT_TENANT_SETTINGS.permissions.admin, ...(settings?.permissions?.admin || {}) }
    }
  };

  const [localSettings, setLocalSettings] = useState(safeSettings);
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
  };

  const renderSwitches = (role: 'member' | 'admin') => (
    <div className="space-y-6">
      {PERMISSION_DEFINITIONS.map((def) => (
        <div key={def.key} className="flex items-center justify-between">
            <div className="space-y-0.5">
                <Label className="text-base text-foreground">{def.label}</Label>
                <p className="text-xs text-muted-foreground">{def.description}</p>
            </div>
            <Switch 
                // @ts-ignore
                checked={localSettings.permissions[role][def.key]}
                onCheckedChange={(v) => handleToggle(role, def.key, v)}
                disabled={!isOwner}
                className="data-[state=checked]:bg-emerald-600"
            />
        </div>
      ))}
    </div>
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
                <User className="w-4 h-4 mr-2" /> Permissões de Membro
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
                <Shield className="w-4 h-4 mr-2" /> Permissões de Admin
            </TabsTrigger>
        </TabsList>

        <TabsContent value="member" className="mt-4">
            {/* CORREÇÃO AQUI: bg-card, border-border */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground">Acesso Padrão (Membro)</CardTitle>
                    <CardDescription className="text-muted-foreground">Defina o que usuários comuns podem fazer.</CardDescription>
                </CardHeader>
                <CardContent>{renderSwitches('member')}</CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-foreground">Acesso Administrativo</CardTitle>
                    <CardDescription className="text-muted-foreground">Defina os super-poderes dos seus gerentes.</CardDescription>
                </CardHeader>
                <CardContent>{renderSwitches('admin')}</CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px]">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar Regras'}
        </Button>
      </div>
    </div>
  );
}