'use client';

import { Search } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    // CORREÇÃO: bg-muted/50, border-input, text-foreground
    <div className="flex items-center gap-2 bg-muted/50 border border-input rounded-lg px-3 py-2 w-full md:w-64 transition-colors focus-within:ring-1 focus-within:ring-ring">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input 
        placeholder="Buscar lançamentos..." 
        className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        onChange={(e) => {
           const value = e.target.value;
           setTimeout(() => handleSearch(value), 500); 
        }}
        defaultValue={searchParams.get('q')?.toString()}
      />
    </div>
  );
}