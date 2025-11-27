'use client';

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InfoHelpProps {
  title: string;
  children: React.ReactNode;
}

export function InfoHelp({ title, children }: InfoHelpProps) {
  return (
    <Popover>
        <PopoverTrigger asChild>
            <button className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted focus:outline-none">
                <Info className="w-3.5 h-3.5" />
                <span className="sr-only">Info</span>
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4 bg-popover border-border shadow-xl z-[50]" align="start">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">{title}</h4>
            <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                {children}
            </div>
        </PopoverContent>
    </Popover>
  );
}
