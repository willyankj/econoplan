'use client';

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AVAILABLE_ICONS, getIcon } from "@/lib/icons"; // <--- Import centralizado

const AVAILABLE_COLORS = [
  "#94a3b8", // Slate (Padrão)
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
];

interface IconPickerProps {
  selectedIcon: string;
  selectedColor: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function IconPicker({ selectedIcon, selectedColor, onIconChange, onColorChange }: IconPickerProps) {
  const CurrentIcon = getIcon(selectedIcon);

  return (
    <div className="flex gap-2 w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-12 h-10 p-0 shrink-0" style={{ color: selectedColor, borderColor: selectedColor }}>
            <CurrentIcon className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 z-[200]">
          <div className="grid grid-cols-5 gap-1 max-h-[200px] overflow-y-auto">
            {AVAILABLE_ICONS.map(iconName => {
              const Icon = getIcon(iconName);
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => onIconChange(iconName)}
                  className={cn(
                    "p-2 rounded-md hover:bg-muted flex items-center justify-center transition-colors",
                    selectedIcon === iconName ? "bg-muted text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto p-1 no-scrollbar bg-muted/30 rounded-md border border-border">
        {AVAILABLE_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all shrink-0",
              selectedColor === color ? "border-white scale-110 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      
      <input type="hidden" name="icon" value={selectedIcon} />
      <input type="hidden" name="color" value={selectedColor} />
    </div>
  );
}