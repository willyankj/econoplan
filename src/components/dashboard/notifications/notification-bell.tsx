'use client';

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  read: boolean;
  // CORREÇÃO: Deve ser 'string' para aceitar o formato serializado do Server Component
  createdAt: string; 
  type: string;
  link: string | null;
}

export function NotificationBell({ notifications = [] }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRead = async (id: string, link: string | null) => {
    await markNotificationAsRead(id);
    if (link) {
        setOpen(false);
        router.push(link);
    }
  };

  const handleMarkAll = async () => {
      await markAllNotificationsAsRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-background rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
            <h4 className="font-semibold text-foreground">Notificações</h4>
            {unreadCount > 0 && (
                <Button variant="ghost" onClick={handleMarkAll} className="text-xs h-6 text-emerald-500 hover:text-emerald-600">
                    <Check className="w-3 h-3 mr-1" /> Marcar todas
                </Button>
            )}
        </div>

        <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhuma notificação.
                </div>
            ) : (
                notifications.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleRead(item.id, item.link)}
                        className={`p-4 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!item.read ? 'bg-muted/20' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <p className={`text-sm ${!item.read ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                {item.title}
                            </p>
                            {!item.read && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2 text-right">
                            {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                ))
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}