import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  searchInputRef,
}: SearchBarProps) {
  return (
    <div className="flex-shrink-0">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transform" />
        <Input
          ref={searchInputRef}
          placeholder="Search all endpoints by path, method, or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-12 border-0 !bg-transparent pr-12 pl-12 text-lg shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 transform"
            onClick={onClearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
