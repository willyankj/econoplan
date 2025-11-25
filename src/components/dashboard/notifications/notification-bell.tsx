'use client';

import { useState } from "react";
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
  type: string; // INFO, WARNING, SUCCESS, ERROR
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

  const getIcon = (type: string) => {
    switch (type) {
        case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        case 'ERROR': return <XCircle className="w-4 h-4 text-rose-500" />;
        case 'SUCCESS': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
      if (read) return 'bg-transparent';
      switch (type) {
          case 'WARNING': return 'bg-amber-500/10 border-l-2 border-amber-500';
          case 'ERROR': return 'bg-rose-500/10 border-l-2 border-rose-500';
          case 'SUCCESS': return 'bg-emerald-500/10 border-l-2 border-emerald-500';
          default: return 'bg-blue-500/10 border-l-2 border-blue-500';
      }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground transition-all">
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-foreground animate-pulse' : ''}`} />
          
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-background rounded-full flex items-center justify-center">
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border shadow-xl overflow-hidden rounded-xl">
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                Notificações 
                {unreadCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
            </h4>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAll} className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                    <Check className="w-3 h-3 mr-1" /> Lidas
                </Button>
            )}
        </div>

        <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">Tudo limpo por aqui!</p>
                </div>
            ) : (
                notifications.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleRead(item.id, item.link)}
                        className={`p-4 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group relative ${getBgColor(item.type, item.read)}`}
                    >
                        <div className="flex gap-3 items-start">
                            <div className="mt-0.5 shrink-0">
                                {getIcon(item.type)}
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className={`text-sm leading-none ${!item.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                    {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {item.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground/50 pt-1">
                                    {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            {!item.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}