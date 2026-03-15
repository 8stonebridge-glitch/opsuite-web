'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChangeText, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="relative mb-3">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={2} />
      </div>
      <Input
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl pl-11 pr-4 py-3 h-auto text-sm"
      />
    </div>
  );
}
